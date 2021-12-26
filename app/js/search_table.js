angular.module('JFLA.SNDEVTOOLS.SEARCH_TABLE', []);
angular
  .module('JFLA.SNDEVTOOLS.SEARCH_TABLE')
  .config(
    [
      '$compileProvider',
      function ($compileProvider) {
        $compileProvider
          .aHrefSanitizationWhitelist(/^\s*(https?|chrome-extension):/);
      }
    ]);
angular
  .module('JFLA.SNDEVTOOLS.SEARCH_TABLE')
  .controller(
    'JFLA.SNDEVTOOLS.SEARCH_TABLE.CTRL',
    function ($scope) {
      $scope.open_page = function (url) { // delete
        openNewTab(url);
      }
      var paramsString = document.location.search;
      var searchParams = null;
      if (paramsString) {
        paramsString = decodeURIComponent(paramsString
          .substring(1));
        searchParams = new URLSearchParams(paramsString);
      }
      if (!searchParams || !searchParams.has("url")) return;
      $scope.url = searchParams.get("url");
      if (!$scope.url.endsWith('/'))
        $scope.url = $scope.url + '/';

      $scope.is_loading = false;
      $scope.tables = [];
      $scope.$watch('name_filter', function () {
        var query = $scope.name_filter + '';
        if (!$scope.name_filter || query.length < 3) {
          $scope.is_loading = false;
          return;
        }
        if ($scope.query && query.startsWith($scope.query)) {
          return;
        }
        if ($scope.is_loading) {
          $scope.name_filter = $scope.query;
        }
        $scope.is_loading = true;
        $scope.query = query;
        var query = encodeURI(query);
        var url = $scope.url + "api/now/table/sys_db_object?sysparm_query=nameLIKE" + query + "%5EORlabelLIKE" + query;
        var regexp = /[0-9a-f]{32}/;
        getRecordDataJSON(url, function (rows) {
          $scope.tables = [];
          if (!rows) {
            $scope.tables = null;
            $scope.is_loading = false;
            $scope.$digest();
            return;
          }
          rows.forEach(function (v) {
            if (!v.name) return;
            count = 0;
            $scope.tables.push({
              counts: 1,
              name: v.name,
              label: v.label,
              super_class: v.super_class ? v.super_class.display_value : '-',
              super_class_sys_id: v.super_class ? v.super_class.link.match(regexp) : '-',
              sys_scope: v.sys_scope ? v.sys_scope.display_value : '-',
              sys_scope_isHref: !v.sys_scope || v.sys_scope.display_value == 'Global' ? 'false' : 'true',
              sys_scope_sys_id: v.sys_scope ? v.sys_scope.link.match(regexp) : '-',
              sys_id: v.sys_id
            });
          });
          $scope.is_loading = false;
          $scope.$digest();
        }, 20000, "sys_id,name,label,super_class,sys_scope");
      });

      // table sort property
      $scope.tableSortPropertyName = 'label';
      // desc
      $scope.table_reverse = true;

      $scope.sortByForTable = function (propertyName) {
        $scope.table_reverse = ($scope.tableSortPropertyName === propertyName) ? !$scope.table_reverse : false;
        $scope.tableSortPropertyName = propertyName;
      };
    }).filter('byname', function () {
    return function (input, name) {
      return input.filter(function (v) {
        return v.name.toLowerCase().includes(name.toLowerCase()) ||
          (v.label && v.label.toLowerCase().includes(name.toLowerCase()));
      });
    };
  }).filter('emphasize', function ($sce) {
    return function (input, name) {
      if (!name)
        return input;
      return $sce.trustAsHtml(
        input.replace(new RegExp('(' + name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + ')', 'ig'),
          "<em>$1</em>")
      );
    };
  });