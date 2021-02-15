var g_ck = '';
function isSNOWURL(url) {
    var valid = (/^https:\/\/[a-zA-Z0-9.-]*\.service-now\.com\/.*/.test(url));
    return valid;
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (isSNOWURL(tab.url)) {
        chrome.pageAction.show(tabId);
        if (changeInfo.status != 'complete')
            return;
    }
});

chrome.commands.onCommand.addListener(function (command) {
    if (command == "pop")
        pop();

    return true;
});

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

// chrome.runtime.onMessage.addListener(
//     function (request, sender, sendResponse) {
//         if (request.method == "getGck") {
//             getGck(request.tabId);
//             sendResponse({
//                 gck: g_ck
//             });
//         }
//         return;
//     });

// function getGck(tabId) {
//     chrome.tabs.sendMessage(tabId, {
//         method: "getVars",
//         myVars: "g_ck"
//     }, function (response) {
//         if (response == null || typeof response !== 'object') return;
//         g_ck = response.myVars.g_ck;
//         console.log('bk2' + g_ck);
//     });
// }