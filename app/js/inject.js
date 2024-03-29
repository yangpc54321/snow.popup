function snuSettingsAdded() {
    setShortCuts();
    renderRunScriptPage();
}

function setShortCuts() {
    document.addEventListener("keydown", function (event) {
        if (typeof g_form != 'undefined') {
            mySysId = g_form.getUniqueValue();
            var action;
            if ((event.ctrlKey || event.metaKey) && event.keyCode == 83) { //cmd-s
                event.preventDefault();
                action = g_form.newRecord ? "sysverb_insert_and_stay" : "sysverb_update_and_stay";
                gsftSubmit(null, g_form.getFormElement(), action);
                return false;
            }
        }

    }, false);
}

function renderRunScriptPage() {
    if (!location.href.includes("/sys.scripts.do")) return; //only in bg script
    var body = document.body;
    var forms = document.forms;
    if (forms.length > 0) {
        var divNode = document.createElement("div");
        divNode.innerHTML = `<div id='run_script_main'>
        <div id='run_script_output'><h4><span style='color: black;font-size: large;'>Script output</span></span></h4>
        <iframe name='run_script_out_iframe' id='run_script_out_iframe'></iframe><div class='run_script_out_loading'>
        <div id='run_script_out_loader'></div></div></div></div>`;
        if (!document.getElementById('run_script_main')) {
            body.appendChild(divNode);
        }

        forms[0].target = "run_script_out_iframe";
        forms[0].getElementsByTagName('textarea')[0].onkeypress = function (key) {
            if (key.code == "Enter" && key.ctrlKey) {
                document.getElementsByName('runscript')[0].click();
            }
        }
        document.getElementById('run_script_out_iframe').onload = function () {
            document.getElementById('run_script_output').className = "";
        };
        forms[0].onsubmit = function () {
            document.getElementById('run_script_output').className = "loading";
            document.getElementById('run_script_output').src = "";
        };
    }

    var title = "Background Script";
    document.title = title;

    if (document.forms[0]) {
    } else {
        var output = document.querySelector("body pre");
        var lines = output.innerText.split('\n')
            .filter(line => line.startsWith('*** Script: '))
            .map(line => line.substring(12));

        var openURL = lines.find(line => line.startsWith('!url='));
        if (openURL) {
            window.location = openURL.substring(5);
        }
        var message = lines.filter(line => line.startsWith('!message='))
            .map(line => line.substring(9)).join('<br />');
        if (message) {
            var h = document.createElement("strong");
            h.innerHTML = (message);
            body.appendChild(h);
            output.style = 'display: none;';
        }
    }
}