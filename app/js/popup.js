var sndevtoolsApp = angular.module('JFLA.SNDEVTOOLS.APP', []);
sndevtoolsApp
    .config(
        [
            '$compileProvider',
            function ($compileProvider) {
                $compileProvider
                    .aHrefSanitizationWhitelist(/^\s*(https?|chrome-extension):/);
            }
        ]);

sndevtoolsApp
    .factory('sampleService', function () {
        return {
            method: function () {
                return 'sample service created by factory.'
            }
        };
    });
sndevtoolsApp.directive('highlightOnClick', function () {
    return {
        restrict: 'A',
        link: function ($scope, element) {
            element.bind('click', function () {
                if (parseInt(element.text()) === 0) {
                    element.toggleClass('red');
                } else {
                    element.toggleClass('yellow');
                }
            })
        }
    }
});
sndevtoolsApp
    .controller('JFLA.SNDEVTOOLS.APP.CTRL',
        function ($scope, sampleService) {
            // $scope.message = sampleService.method();
            $scope.g_ck = '';
            $scope.tab_selected = '';
            $scope.instance = '';
            $scope.favorite_key = 'favorite_tables';
            $scope.tab_key = 'current_tab';
            $scope.favorite_tables = [];
            $scope.show_tables_filter = false;
            $scope.show_updates_filter = false;
            $scope.table_result_arr = [];
            $scope.recent_updates_arr = [];
            $scope.server_nodes_arr = [];

            $scope.record = {
                table: '',
                sys_id: ''
            };
            $scope.update_set = {
                error: true,
                loading: true
            };
            $scope.find_table = {
                loading: false,
                error: true,
            };
            $scope.current_record = {
                error: true,
                loading: true
            };
            $scope.recent_updates = {
                error: true,
                loading: true
            };
            $scope.server_nodes = {
                error: true,
                loading: true
            };
            $scope.user = {
                error: true,
                loading: true
            };

            $scope.session = {
                user: {},
                update_set: {},
                error: true,
                loading: true
            };

            getCurrentTab(function (tab) {
                chrome.tabs.sendMessage(tab.id, {
                    method: "getVars",
                    myVars: "g_ck"
                }, function (response) {
                    if (response == null || typeof response !== 'object') return;
                    $scope.g_ck = response.myVars.g_ck;
                });
            });

            getCurrentURL(function (tabURL) {
                $scope.listURL = parseListURL(unpackURL(tabURL));
                $scope.recordURL = parseRecordURL(unpackURL(tabURL));
                $scope.plainURL = unpackURL(tabURL);
                $scope.instance = (new URL(tabURL)).host.replace(".service-now.com", "");
                var foundTiny = $scope.plainURL.match(/^(https:\/\/[a-zA-Z0-9.-]*\/)([a-zA-Z0-9_-]+)\.do.*[&\?]sysparm_tiny=([^&]*)/);
                var foundUI15 = $scope.plainURL.match(/^(https:\/\/[a-zA-Z0-9.-]*\/)navpage\.do.*/);
                $scope.tinyURL = !!foundTiny;
                $scope.ui15URL = !!foundUI15;
                $scope.tabURL = tabURL;
                if ($scope.listURL || $scope.recordURL) {
                    $scope.table = ($scope.listURL || $scope.recordURL).table;
                }
                // updates sort property
                $scope.updateSortPropertyName = 'sys_created_on';
                // desc
                $scope.update_reverse = true;

                // node sort property
                $scope.nodeSortPropertyName = 'system_id';
                // desc
                $scope.node_reverse = true;
                //
                var favoriteKey = $scope.instance + '-' + $scope.favorite_key;
                chrome.storage.local.get(favoriteKey, function (result) {
                    if (result[favoriteKey] != undefined) {
                        $scope.favorite_tables = result[favoriteKey];
                    }
                });

                var sortKey = $scope.instance + '-' + 'table-sort';
                chrome.storage.local.get(sortKey, function (result) {
                    if (result[sortKey] != undefined) {
                        $scope.tableSortPropertyName = result[sortKey].propertyName;
                        $scope.table_reverse = result[sortKey].reverse;
                    } else {
                        $scope.tableSortPropertyName = 'label';
                        $scope.table_reverse = false;
                    }
                });

                //画面初期化時に表示するタブ
                var tabKey = $scope.instance + '-' + $scope.tab_key;
                chrome.storage.local.get(tabKey, function (result) {
                    if (result[tabKey] != undefined) {
                        $scope.tab_selected = result[tabKey];
                    } else {
                        $scope.tab_selected = 'jfla_session';
                    }
                    $scope.select_tab($scope.tab_selected);
                });
            });


            /**
             * タブ表示制御
             */
            setTabControl = function (show_tables_filter, show_updates_filter) {
                $scope.show_tables_filter = show_tables_filter;
                $scope.show_updates_filter = show_updates_filter;
            };
            $scope.select_tab = function (jfla) {
                $scope.tab_selected = jfla;
                setToChromeStorageForString($scope.instance, $scope.tab_key, jfla);

                //「セッション」タブを選択時
                if (jfla == 'jfla_session') {
                    setTabControl(false, false);
                    getCurrentURL(initSessionTab);
                }

                //「テーブル」タブを選択時
                if (jfla == 'jfla_table') {
                    setTabControl(true, false);
                    if ($scope.table_result_arr.length == 0) {
                        getCurrentURL(initSearchTableHanedler);
                    }
                }

                //「レコード」タブを選択時
                if (jfla == 'jfla_current_record') {
                    setTabControl(false, false);
                    getCurrentTab(getCurrentRecord);
                }

                //「更新セット」タブを選択時
                if (jfla == 'jfla_update') {
                    setTabControl(false, true);
                    if ($scope.recent_updates_arr.length != 0) {
                        return;
                    }
                    getCurrentURL(getLastChanges);
                }

                //「ノード」タブを選択時
                if (jfla == 'jfla_nodes') {
                    setTabControl(false, false);
                    if ($scope.server_nodes_arr.length != 0) {
                        return;
                    }
                    getCurrentURL(getNodes);
                }
            };

            $scope.open_snow = function (page, target_self) {
                getCurrentURL(function (tabURL) {
                    var url = tabURL.replace(
                        /(https:\/\/[a-zA-Z0-9.-]*)\/.*/,
                        "$1/" + page);
                    if (target_self)
                        refreshURL(url);
                    else
                        openNewTab(url);
                });
            };

            $scope.addFavorites = function (sysId, indexOf) {
                var key = $scope.instance + '-' + $scope.favorite_key;
                chrome.storage.local.get(key, function (result) {
                    if (result[key] == undefined) {
                        $scope.favorite_tables = saveFavoriteTableToChromeStorage($scope.instance, $scope.favorite_key, $scope.favorite_tables, sysId, indexOf);
                    } else {
                        $scope.favorite_tables = saveFavoriteTableToChromeStorage($scope.instance, $scope.favorite_key, result[key], sysId, indexOf);
                    }
                });
            };

            $scope.open_xml_page = function (url) {
                if (!$scope.listURL && !$scope.recordURL) {
                    return;
                }
                openNewTab(url);
            };

            $scope.open_search_table_page = function (page, transform) {
                if (!$scope.user.loading && !$scope.user.sys_id) {
                    return;
                }
                if (!transform) {
                    openTab(chrome.runtime.getURL("/" + page))();
                    return;
                }
                getCurrentURL(function (tabURL) {
                    var params = tabURL.replace(
                        /(https:\/\/[a-zA-Z0-9.-]*)\/(.*)/, transform);
                    openTab(chrome.runtime.getURL("/" + page + "?" + encodeURIComponent(params)))();
                });
            };

            /**
             * 表示制御
             */
            setControl = function (elementObj, isLoading, isError) {
                //ロード中であるかを設定
                elementObj.loading = isLoading;
                //エラー発生するかを設定
                elementObj.error = isError;
                //画面に適用
                $scope.$apply();
            };

            //Sessionタブが押された場合、実行する
            initSessionTab = function (tabURL) {
                //画面表示を制御する
                setControl($scope.session, true, false);
                //URLをマッチする
                var currentURL = tabURL.match(/^https:\/\/[a-zA-Z0-9.-]*\//);
                //SNOWのURL以外の場合、エラーとする
                if (!isSNOWURL(tabURL) || (currentURL == null)) {
                    //エラーとして、画面表示を制御する
                    setControl($scope.session, false, true);
                    return;
                }

                getRecordDataJSON(currentURL[0] + 'api/now/table/sys_user?sysparm_query=sys_id=javascript:%20gs.getUserID()', function (rows) {
                    $scope.session.user = rows[0];
                    //画面表示を制御する
                    setControl($scope.session, false, false);
                }, 1, ['name, user_name, sys_id'], $scope.g_ck);

                getRecordDataJSON(currentURL[0] + 'api/now/table/sys_user_preference?sysparm_query=name%3Dsys_update_set%5EuserDYNAMIC90d1921e5f510100a9ad2572f2b477fe', function (rows) {
                    getRecordDataJSON(currentURL[0] + 'api/now/table/sys_update_set?sys_id=' + rows[0].value, function (rows) {
                        $scope.session.update_set = rows[0];
                        //画面表示を制御する
                        setControl($scope.session, false, false);
                    }, 1, ['sys_id,name,is_default,application.name,application.scope,application.sys_id'], $scope.g_ck);
                    //画面表示を制御する
                    setControl($scope.session, false, false);
                }, 1, ['value'], $scope.g_ck);
            }

            getLastChanges = function (tabURL) {
                $scope.recent_updates.loading = true;
                $scope.recent_updates.error = false;
                $scope.$apply();
                var foundURL = tabURL.match(/^https:\/\/[a-zA-Z0-9.-]*\//);
                if (!isSNOWURL(tabURL) || (foundURL == null)) {
                    $scope.recent_updates.loading = false;
                    $scope.recent_updates.error = true;
                    $scope.$apply();
                    return;
                }

                getRecordData(foundURL[0] + 'sys_update_version_list.do?sysparm_query=ORDERBYDESCsys_created_on^state=current^type!=Access Roles^sys_created_by%3Djavascript:%20gs.getUserName()', function (url, rows, url) {
                    if (rows == null) {
                        $scope.recent_updates.loading = false;
                        $scope.recent_updates.error = true;
                        $scope.$apply();
                        return;
                    }
                    if (!rows.length) {
                        $scope.recent_updates.loading = false;
                        $scope.recent_updates.error = true;
                        $scope.$apply();
                        return;
                    }
                    $scope.recent_updates = rows;
                    $scope.recent_updates.loading = false;
                    $scope.recent_updates.error = false;
                    var upd_sets = rows.map(v => v.source).filter((elem, pos, arr) => (arr.indexOf(elem) == pos));
                    getRecordData(url + 'sys_update_set_list.do?sysparm_query=sys_idIN' + upd_sets.join(),
                        function (url, rows) {
                            if (rows == null) {
                                return;
                            }
                            if (!rows.length) {
                                return;
                            }
                            var upd_sets = {};
                            rows.forEach(v => upd_sets[v.sys_id] = v);

                            $scope.recent_updates.forEach(function (v) {
                                $scope.recent_updates_arr.push({
                                    type: v.type,
                                    name: v.name,
                                    record_name: v.record_name,
                                    sys_created_on: v.sys_created_on,
                                    source: upd_sets[v.source]
                                });
                            });

                            $scope.$apply();
                        }, null, 30);

                    $scope.$apply();
                }, foundURL[0], 30, "source,sys_created_on,name,record_name,type");
            }

            getCurrentRecord = function (tab) {
                $scope.current_record.loading = true;
                $scope.current_record.error = false;
                $scope.$apply();

                chrome.tabs.sendMessage(tab.id, {
                    method: "getVars",
                    myVars: "g_form.tableName,NOW.sysId,mySysId,elNames"
                }, function (response) {
                    $scope.record.table = response.myVars.g_formtableName || getParameterByName("table", response.frameHref);
                    $scope.record.sys_id = response.myVars.NOWsysId || response.myVars.mySysId || getParameterByName("sys_id", response.frameHref);
                    $scope.$apply();
                    if (!$scope.record.sys_id) {
                        $scope.current_record.loading = false;
                        $scope.current_record.error = true;
                        $scope.$apply();
                        return;
                    } else {
                        $scope.current_record.loading = false;
                        $scope.current_record.error = false;
                        $scope.$apply();
                    }
                });
            }

            getNodes = function (tabURL) {
                $scope.server_nodes.loading = true;
                $scope.server_nodes.error = false;
                $scope.$apply();
                var currentURL = tabURL.match(/^https:\/\/[a-zA-Z0-9.-]*\//);
                getRecordDataJSON(currentURL[0] + 'api/now/table/sys_cluster_state?sysparm_query', function (rows) {
                    $scope.server_nodes_arr = rows;
                    $scope.server_nodes.loading = false;
                    $scope.server_nodes.error = false;
                    $scope.$apply();
                }, 10, ['sys_id,system_id,status'], $scope.g_ck);
            }

            initSearchTableHanedler = function (tabURL) {
                $scope.find_table.loading = true;
                $scope.find_table.error = false;
                $scope.$apply();

                var key = $scope.instance + '-' + "table";
                chrome.storage.local.get(key, function (result) {
                    var jsonRows = result[key];
                    if (jsonRows == undefined) {
                        var fields = 'sys_id,name,label,super_class,sys_scope';
                        var query = 'sys_update_nameISNOTEMPTY^ORDERBYlabel^nameNOT LIKElog00^nameNOT LIKEevent00%5EORDERBYlabel';
                        var foundURL = tabURL.match(/^https:\/\/[a-zA-Z0-9.-]*\//);
                        var url = foundURL[0] + "api/now/table/sys_db_object?sysparm_query=" + query;
                        getRecordDataJSON(url, function (rows) {
                            $scope.table_result_arr = [];
                            if (!rows) {
                                $scope.find_table.loading = false;
                                $scope.find_table.error = true;
                                $scope.$apply();
                                return;
                            } else {
                                setToChromeStorageForString($scope.instance, 'table', rows);
                            }

                            rows.forEach(function (v) {
                                $scope.table_result_arr.push({
                                    label: v.label,
                                    name: v.name,
                                    super_class: v.super_class ? v.super_class.display_value : '-',
                                    sys_scope: v.sys_scope ? v.sys_scope.display_value : '-',
                                    sys_id: v.sys_id
                                });
                            });
                            $scope.find_table.loading = false;
                            $scope.find_table.error = false;
                            $scope.$apply();
                        }, 5000, fields, $scope.g_ck);
                    } else {
                        jsonRows.forEach(function (v) {
                            var isFavorite = false;
                            $scope.favorite_tables.forEach((sid) => {
                                if (sid == v.sys_id) {
                                    isFavorite = true;
                                }
                            });
                            $scope.table_result_arr.push({
                                label: v.label,
                                name: v.name,
                                super_class: v.super_class ? v.super_class.display_value : '-',
                                sys_scope: v.sys_scope ? v.sys_scope.display_value : '-',
                                sys_id: v.sys_id,
                                favorite: isFavorite
                            });
                        });
                        $scope.find_table.loading = false;
                        $scope.find_table.error = false;
                        $scope.$apply();
                    }
                });
            };

            refreshTableHanedler = function (tabURL) {
                $scope.find_table.loading = true;
                $scope.find_table.error = false;
                $scope.table_result_arr = [];
                $scope.$apply();

                var fields = 'sys_id,name,label,super_class,sys_scope';
                var query = 'sys_update_nameISNOTEMPTY^ORDERBYlabel^nameNOT LIKElog00^nameNOT LIKEevent00%5EORDERBYlabel';
                var url = tabURL.match(/^https:\/\/[a-zA-Z0-9.-]*\//)[0] + "api/now/table/sys_db_object?sysparm_query=" + query;
                getRecordDataJSON(url, function (rows) {
                    if (!rows) {
                        $scope.find_table.loading = false;
                        $scope.find_table.error = true;
                        $scope.$apply();
                        return;
                    } else {
                        setToChromeStorageForString($scope.instance, 'table', rows);
                    }

                    rows.forEach(function (v) {
                        var isFavorite = false;
                        $scope.favorite_tables.forEach((sid) => {
                            if (sid == v.sys_id) {
                                isFavorite = true;
                            }
                        });
                        $scope.table_result_arr.push({
                            label: v.label,
                            name: v.name,
                            super_class: v.super_class ? v.super_class.display_value : '-',
                            sys_scope: v.sys_scope ? v.sys_scope.display_value : '-',
                            sys_id: v.sys_id,
                            favorite: isFavorite
                        });
                    });
                    $scope.find_table.loading = false;
                    $scope.find_table.error = false;
                    $scope.$apply();
                }, 5000, fields, $scope.g_ck);
            };

            $scope.refreshTable = function () {
                getCurrentURL(refreshTableHanedler);
            }

            $scope.sortByForUpdate = function (propertyName) {
                $scope.update_reverse = ($scope.updateSortPropertyName === propertyName) ? !$scope.update_reverse : false;
                $scope.updateSortPropertyName = propertyName;
            };

            $scope.sortByForTable = function (propertyName) {
                $scope.table_reverse = ($scope.tableSortPropertyName === propertyName) ? !$scope.table_reverse : false;
                $scope.tableSortPropertyName = propertyName;
                var table_sort = {};
                table_sort.reverse = $scope.table_reverse;
                table_sort.propertyName = $scope.tableSortPropertyName;
                setToChromeStorageForString($scope.instance, 'table-sort', table_sort);
            };

            $scope.sortByForNode = function (propertyName) {
                $scope.node_reverse = ($scope.nodeSortPropertyName === propertyName) ? !$scope.node_reverse : false;
                $scope.nodeSortPropertyName = propertyName;
            };

            $scope.popup = function (url) {
                pop();
            }
        });