var url = document.location.search;
if (url)
  url = decodeURIComponent(url.substring(1));
document.getElementById('openGlideURL').addEventListener('click', function () {

});

document.getElementById('openGlideURL').firstChild.nodeValue = url;


function getRecordQuery(table, sys_id, innerCode) {
  var code = "";
  code += "var gr_" + table + " = new GlideRecord('" + table + "');\n";
  code += "\n";
  code += "if (gr_" + table + ".get('" + sys_id + "')) {\n";
  if (table == "wf_context")
    code += "\tvar current = gr_" + table + ".id;\n";
  else
    code += "\tvar current = gr_" + table + ";\n";
  code += "\tvar workflow = {\n";
  if (table == "sc_req_item")
    code += "\t\tvariables: current.variables,\n";
  if (table == "wf_context") {
    code += "\t\tscratchpad: gr_" + table + ".scratchpad,\n";
  } else {
    code += "\t\tscratchpad: {},\n";
  }
  code += "\t\tlog : gs.log,\n";
  code += "\t\tdebug : gs.log\n";
  code += "\t};\n";
  code += "\n";
  code += "var answer = '';\n";
  code += "\t// ------------- SINGLE RECORD OPERATION --------------\n";
  code += "\t\n";
  code += innerCode;
  code += "\t\n";
  code += "\t// ----------------------------------------------------\n";
  code += "\tgs.log('answer=' + JSON.stringify(answer, null, 5));\n";
  code += "\tgs.log('workflow.scratchpad=' + JSON.stringify(workflow.scratchpad, null, 5));\n";
  code += "}";
  return code;
}

function getListQuery(table, query, innerCode) {
  var code = "";
  code += "var gr_" + table + " = new GlideRecord('" + table + "');\n";
  code += "gr_" + table + ".addEncodedQuery('" + decodeURIComponent(query) +
    "');\n";
  code += "gr_" + table + ".query();\n";
  code += "\n";
  code += "while (gr_" + table + ".next()) {\n";
  code += "\tvar current = gr_" + table + ";\n";
  code += "\n";
  code += "\t// ------- !!! MULTIPLE RECORDS OPERATION !!! ---------\n";
  code += "\t\n";
  code += innerCode;
  code += "\t\n";
  code += "\t// ----------------------------------------------------\n";
  code += "}";
  return code;
}

function generateGRCode(codeFactory) {
  var foundURL = parseListURL(unpackURL(url));
  if (foundURL) {
    document.getElementById('glideRecordCode').className = "loading";
    getRecordData(
      foundURL.host +
      foundURL.table +
      "_list.do?sysparm_query=" + encodeURIComponent(foundURL.query) + "&sysparm_order=sys_created_on&sysparm_order_direction=desc",
      function (url, currentRows, params) {
        var code = "";
        if (currentRows && currentRows[0] && params) {
          var currentRow = currentRows[0];
          code = codeFactory(currentRow);
          code = getListQuery(params.table,
            decodeURIComponent(params.query), code);
        } else {
          code = codeFactory({});
          code = getListQuery(params.table,
            decodeURIComponent(params.query), code);
          code = "// An error occured !!! Status = " +
            +JSON.stringify(params) + "\n" + code;
        }
        document.getElementById('glideRecordCode').value = code;
        document.getElementById('glideRecordCode').className = "";
        openSysScripts(params.host, {
          code: code
        });
      }, foundURL);
  }

  foundURL = parseRecordURL(unpackURL(url));
  if (foundURL) {
    document.getElementById('glideRecordCode').className = "loading";
    getRecordData(foundURL.host + foundURL.table + ".do?sys_id=" +
      foundURL.sys_id,
      function (url, currentRows, params) {
        var code = "";
        if (currentRows && currentRows[0] && params) {
          var currentRow = currentRows[0];
          code = codeFactory(currentRow);
          code = getRecordQuery(params.table, params.sys_id, code);
        } else {
          code = codeFactory({});
          code = getRecordQuery(params.table, params.sys_id, code);
          code = "// An error occured !!! Status = " +
            +JSON.stringify(params) + "\n" + code;
        }
        document.getElementById('glideRecordCode').value = code;
        document.getElementById('glideRecordCode').className = "";
        openSysScripts(params.host, {
          code: code
        });
      }, foundURL);
  }
}