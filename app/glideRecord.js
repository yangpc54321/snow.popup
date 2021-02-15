generateGRCode(function(currentRow) {
	var code = "";
	for ( var field in currentRow)
		code += "\tcurrent." + field + "; " + "\n";
	return code;
});