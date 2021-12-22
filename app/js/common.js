function isSNOWURL(url) {
  var manifest = chrome.runtime.getManifest();
  var valid = (/^https:\/\/[a-zA-Z0-9.-]*\.service-now\.com\/.*/.test(url));
  return valid;
}

function unpackURL(url) {
  if (!isSNOWURL(url))
    return url;
  var foundURL = url
    .match(/^(https:\/\/[a-zA-Z0-9.-]*)\/nav_to.do\?uri=([^&]*)/);
  if (foundURL) {
    return foundURL[1] + decodeURIComponent(foundURL[2]);
  }
  return url;
}

function getCurrentURL(callback) {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function (tabs) {
    var tabURL = tabs[0].url;
    if (tabURL) {
      var unpackedURL = unpackURL(tabURL);
      var foundTiny = unpackedURL.match(/^(https:\/\/[a-zA-Z0-9.-]*\/)([a-zA-Z0-9_-]+)\.do.*[&\?]sysparm_tiny=([^&]*)/);
      if (!foundTiny)
        callback(tabURL);
      else
        getRecordData(foundTiny[1] + '/sys_tiny_url_list.do?sysparm_query=tiny_url=' + foundTiny[3], function (url, currentRows, params) {
          if (!currentRows || currentRows.length != 1) {
            callback(params.tabURL);
          } else {
            var fullURL = params.foundTiny[2] + '.do?' + currentRows[0].data;
            if (params.pack) {
              fullURL = foundTiny[1] + "nav_to.do?uri=%2F" + encodeURIComponent(fullURL);
            } else {
              fullURL = foundTiny[1] + fullURL;
            }
            callback(fullURL);
          }
        }, {
          callback: callback,
          foundTiny: foundTiny,
          tabURL: tabURL,
          pack: tabURL != unpackedURL
        }, 1, 'data');
    }
  });
}

function getCK(callback, g_ck) {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function (tabs) {
    var tab = tabs[0];
    if (tab)
      callback(tab, g_ck);
  });
}

function getCurrentTab(callback) {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function (tabs) {
    var tab = tabs[0];
    if (tab)
      callback(tab);
  });
}

function getParameterByName(name, url) {
  if (!url) url = window.location.href.toLowerCase();
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function openNewTab(newURL, callback) {
  chrome.tabs.query({
    active: true
  }, function (tabs) {
    chrome.tabs.create({
      "url": newURL,
      "index": tabs[0] ? tabs[0].index + 1 : 0
    }, callback);
  });
}

openTab = function (url) {
  return function () {
    openNewTab(url);
  }
}

setTabURL = function (url) {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function (tabs) {
    var tabId = tabs[0].id;
    chrome.tabs.update(tabId, {
      url: url
    });
  });
}

function refreshURL(newURL) {
  window.close();
  setTabURL(newURL + "");
}

parseListURL = function (url) {
  if (!isSNOWURL(url))
    return null;
  if (url) {
    var foundURL = url
      .match(/^(https:\/\/[a-zA-Z0-9.-]*\/)([a-zA-Z0-9_-]+)_list\.do.*[&\?]sysparm_query=([^&]*)/);
    if (foundURL)
      return {
        host: foundURL[1],
        table: foundURL[2],
        query: foundURL[3]
      }
  }
  return null;
}

parseRecordURL = function (url) {
  if (!isSNOWURL(url))
    return null;
  if (url) {
    var foundURL = url
      .match(/^(https:\/\/[a-zA-Z0-9.-]*\/)([a-zA-Z0-9_-]+)\.do.*[&\?]sys_id=([0-9a-zA-Z]{32})/);
    if (foundURL)
      return {
        host: foundURL[1],
        table: foundURL[2],
        sys_id: foundURL[3]
      }
    foundURL = url
      .match(/^(https:\/\/[a-zA-Z0-9.-]*\/)([a-zA-Z0-9_-]+)\.do.*[&\?]sysparm_query=sys_id=([0-9a-zA-Z]{32})/);
    if (foundURL)
      return {
        host: foundURL[1],
        table: foundURL[2],
        sys_id: foundURL[3]
      }
  }
  return null;
}

function getXMLObject(xmlSubtree) {
  var currentRow = {};
  if (xmlSubtree.children && xmlSubtree.children.length == 0)
    return xmlSubtree.firstChild.nodeValue
  for (var j in xmlSubtree.children) {
    var field = xmlSubtree.children[j];
    if (field.firstChild) {
      if (field.nodeName)
        currentRow[field.nodeName] = field.firstChild.nodeValue;
    }
  }
  return currentRow;
}

function getRecordData(url, callback, params, maxcount) {
  if (!maxcount)
    maxcount = 1;
  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE)
      if (xhr.status === 200) {
        if (xhr.responseXML) {
          var xml = xhr.responseXML.documentElement;
          var allRows = [];
          if (xml.children.length == 0)
            callback(url, {}, params);
          else {
            var rows = [];
            for (var i in xml.children) {
              var row = xml.children[i];
              var currentRow = getXMLObject(row);
              if (row.tagName)
                rows.push(currentRow);
            }
            callback(url, rows, params)
          }
        } else {
          callback(url, null, xhr.status);
        }
      } else {
        callback(url, null, xhr.status);
      }
  }
  xhr.open("GET", url + '&sysparm_record_count=' + maxcount + '&XML');
  xhr.send();
}

function getXMLData(url, callback, params) {
  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE)
      if (xhr.status === 200) {
        if (xhr.responseXML) {
          var xml = xhr.responseXML.documentElement;
          if (xml.children.length == 0)
            callback(url, {}, params);
          else {
            var currentRow = getXMLObject(xml);
            callback(url, currentRow, params)
          }
        } else {
          callback(url, null, xhr.status);
        }
      } else {
        callback(url, null, xhr.status);
      }
  }
  xhr.open("GET", url);
  xhr.send();
}

function getRecordDataCSV(url, callback, params, maxcount, fields) {
  if (!maxcount)
    maxcount = 1;
  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE)
      if (xhr.status === 200) {
        if (xhr.response) {
          var getRowArray = function (row) {
            try {
              return JSON.parse("[" + row + "]");
            } catch (e) {
              return row.split(',').map(function (v) {
                return v.replace(/^"|"$/gm, '');
              });
            }
          };
          var csv = xhr.response.split('\n');
          var allRows = [];
          if (csv.length == 2)
            callback(url, [], params);
          else {
            var header = getRowArray(csv[0]);
            var rows = [];
            for (var i = 1; i < csv.length - 1; i++) {
              var currentRow = {};
              var row = getRowArray(csv[i]);
              for (var j = 0; j < row.length; j++) {
                var fieldValue = row[j];
                currentRow[header[j]] = fieldValue;
              }
              rows.push(currentRow);
            }
            callback(url, rows, params)
          }
        } else {
          callback(url, null, xhr.status);
        }
      } else {
        callback(url, null, xhr.status);
      }
  }
  var fullURL = url + '&sysparm_record_count=' + maxcount +
    '&sysparm_fields=' + fields + '&CSV';
  xhr.open("GET", fullURL);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  xhr.send();
}

function getRecordDataFromJsonWebService(url, callback, params, maxcount, fields) {
  if (!maxcount)
    maxcount = 1;
  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        if (xhr.response) {
          var rows = JSON.parse(xhr.response).records;
          // var rows = JSON.parse(xhr.response).result;
          callback(url, rows)
        }
      } else {
        callback(url, null);
      }
    }
  }
  var fullURL = url + '&sysparm_record_count=' + maxcount +
    '&sysparm_fields=' + fields + '&sysparm_display_value=true';
  xhr.open("GET", fullURL);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  xhr.send();
}

function getRecordDataJSON(url, callback, params, maxcount, fields, token) {
  if (!maxcount)
    maxcount = 1;
  var xhr = new XMLHttpRequest();
  xhr.withCredentials = true;
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        if (xhr.response) {
          var rows = JSON.parse(xhr.response).result;
          callback(rows)
        }
      } else {
        callback(null);
      }
    }
  }
  var fullURL = url + '&sysparm_limit=' + maxcount +
    '&sysparm_fields=' + fields + '&sysparm_display_value=true';
  xhr.open("GET", fullURL);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
  xhr.setRequestHeader('Accept', 'application/json');
  xhr.setRequestHeader('Cache-Control', 'no-cache');
  if (token) {
    // xhr.setRequestHeader('X-UserToken', '4d1a9b55db12201028758a18489619ba2fc573561d22fdc3bc1d282680dfc96884fafe4c');
    xhr.setRequestHeader('X-UserToken', token);
  }
  xhr.send();
}

// open background script tab
function openSysScripts(host, code) {
  openNewTab(host + "sys.scripts.do",
    function (tab) {
      chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tabInfo) {
        if (tabId == tab.id) {
          chrome.tabs.sendMessage(tab.id, code, function (response) {
            if (response == "complete") {
              // window.close();
            }
          });
        }
      });
    });
}

function pop() {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function (tabs) {
    var pth;
    var u = new URL(tabs[0].url);
    var tid = tabs[0].id;
    var baseUrl = u.origin
    var navToIdx = u.href.indexOf("nav_to.do?uri=");
    if (navToIdx > -1) {
      pth = decodeURIComponent(u.search.substring(5));
      chrome.tabs.update(tid, {
        url: baseUrl + pth
      });
    } else {
      pth = "/nav_to.do?uri=" + encodeURIComponent(u.pathname + u.search);
      chrome.tabs.update(tid, {
        url: baseUrl + pth
      });
    }
  });
}

function saveFavoriteTableToChromeStorage(instance, theName, favoriteArray, sysId, indexOf) {
  var saveObj = {};
  var isExists = false;
  var length = favoriteArray.length;

  for (var i = 0; i < length; i++) {
    if (favoriteArray[i] == sysId) {
      isExists = true;
      break;
    }
  }
  var favorite = angular.element(document.getElementById('favorite_table_' + indexOf));
  if (isExists) {
    favoriteArray.remove(sysId);
    favorite.attr('class','bi-star');
  } else {
    favoriteArray.push(sysId);
    favorite.attr('class','bi-star-fill');
  }

  saveObj[instance + "-" + theName] = favoriteArray;
  chrome.storage.local.set(saveObj, function () {});
  return favoriteArray;
}

function setToChromeStorageForString(instance, theName, theValue) {
  var saveObj = {};
  saveObj[instance + "-" + theName] = theValue;
  chrome.storage.local.set(saveObj, function () {

  });
}

Array.prototype.remove = function () {
  var what, a = arguments,
    L = a.length,
    ax;
  while (L && this.length) {
    what = a[--L];
    while ((ax = this.indexOf(what)) !== -1) {
      this.splice(ax, 1);
    }
  }
  return this;
}

