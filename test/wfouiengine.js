// UI Engine v1.1.1
// by Dustin Tiemeier (dustin.tiemeier@workflowone.com)
// Edited 04-10-08 by David Peyton (david.peyton@workflowone.com) - fixed "Other" Dropdown and saved Config with IE7 bug
// Edited 06-13-08 by Jonathan Oliver (jonathan.oliver@workflowone.com) - fixed UI_colorRows funcion and table hide funcion due to Jquery update
// Edited 07-21-08 by Jonathan Oliver - added the following tags for xml files: <maininstructions>, <maininstructionbottom>, <lowercase />, <numeric />, <specialchars />
// Copyright 2007 WorkflowOne
// Edited 07-24-08 by Jonathan Oliver - added show/hide row function
// Edited 08-07-08 by Jonathan Oliver - added JQuery UI Datepicker plugin (format instructions at http://docs.jquery.com/UI/Datepicker/%24.datepicker.formatDate#formatdatesettings)
// Edited 10-02-09 by Jonathan Oliver - added optional argument for UI_openAccentWindow function to accept a filename argument to point to a different accent window, edited <specialchars /> tag to do the same
// Edited 01-08-10 by Jonathan Oliver - fixed file upload functionality issues that resulted from four51 R12 release 
// Edited 02-24-10 by Jonathan Oliver - added <dynamic /> tag and UI_SetDynamicDrops() function to allow saved configurations to correctly retain values from dynamically modified dropdowns
// Edited 06-21-10 by Matt Ralston changed "/option" to ">option" in function DB_populateForm() to fix failing disabled tag for dropdowns
// Edited 12-01-10 by Jonathan Oliver - modified DB_cleanData function to fix issue with stripping of the final character of quoted text inside of a tab DB

// Global UI variables
RANDOMURL = "?" + Math.floor(Math.random() * 1000000);
UI_requiredFields = {};
UI_busy = {};
UI_heartbeat = "";
DB = {};
DB_Populate = {};
DB_SourcePath = "/Themes/Custom/dabab82a-1302-4cc0-b5e6-55d349494117/workflow_specform_images/";
UI_Thumbnails = {};
UI_disabledFields = [];
UI_ShowPreview = false;
UI_ScriptFound = false;
UI_ColorRows = true;
UI_DynamicDrops = [];
UI_DynamicDropsVals = [];

SHARED_FOLDER_PATH = "\\\\storage2\\ProjectFiles\\Four51\\shared\\dabab82a-1302-4cc0-b5e6-55d349494117\\";

CHAR_QUOTE = String.fromCharCode(34);
CHAR_LINEBREAK = String.fromCharCode(13);
CHAR_TAB = String.fromCharCode(9);

// Start your engines (duh)
$(document).ready(function() {
	UI_init();
});

function UI_init() {
	// Add our validation to the submit event
	$("form")[0].onsubmit = function() {
		if (!UI_validateForm()) {return false;}
	}
	$("#wfoForm").hide();
	UI_busy["UI_init"] = true;
	// Heartbeat to keep form hidden while engine formats the form
	UI_heartbeat = setInterval(UI_checkFormStatus, 1000);
	// Hide preview image on configuration edit
	$(".ProductImage").hide();

	// wfoTable setup
	$("#wfoForm").append("<table id=wfoTable></table>");
	$("#wfoTable").attr({cellSpacing: "0", cellPadding: "4"}).css({marginTop: "20px", marginBottom: "20px"});
	
	// Loads configuration XML file(s) 
	for (var i = 0; i < UI_Config.length; i++) {
		UI_Config[i] = "/Themes/Custom/dabab82a-1302-4cc0-b5e6-55d349494117/workflow_specform_images/" + UI_Config[i] + RANDOMURL;
		UI_busy["UI_get"] = true;
		$.get(UI_Config[i], function(response) {
			UI_format(response);
			UI_busy["UI_get"] = false;
		});
	}
	UI_busy["UI_init"] = false;
    $(".SpecForm").hide();
	$("#wfoForm").children().not("#wfoTable").hide();
}
	
// Format the form per instructions in configuration XML
function UI_format(response) {
	UI_busy["UI_format"] = true;
	// var files = false;
	// if ($("input:file").size() > 0) {files = true;}
	$("input", response).each(function() {
		var field = $(this).find("name").text();
		var node = $(spec[field]).parent();
		switch ($(this).find("type").text()) {
			// Format field for select (drop-down)
			case "select":
				if ($(this).find("sharerow").size() > 0) {UI_shareRow(node, $(this).find("sharerow").text());}
				else {UI_createRow(node, field, $(this).children("label").text());}
				$(spec[field]).hide();
				var dropdown = "<select id=wfoDropdown_" + field + " name=wfoDropdown_" + field + ">";
				var selected;
				var thumbnails = false;
				var thumbnailPath;
				var thumbnailSourceExtension;
				var thumbnailExtension;
				var newImg;
				if ($(this).find("thumbnails").size() > 0) {
					thumbnails = true;
					thumbnailPath = $(this).find("thumbnails").find("path").text() + "/";
					thumbnailSourceExtension = "." + $(this).find("thumbnails").find("sourceextension").text();
					thumbnailExtension = "." + $(this).find("thumbnails").find("thumbnailextension").text();
					UI_Thumbnails[field] = {};
					html = "<img id=wfoThumbnail_" + field + " />";
					$("#wfoInstructions_" + field).append(html);
					$("#wfoThumbnail_" + field).hide();
				}
				$(this).find("option").each(function() {
					selected = "";
					if ((($(this).find("value").text() != "") && ($(spec[field]).val() == $(this).find("value").text())) || ((($(spec[field]).val() == "") && ($(this).find("default").size() > 0)))) {selected = " selected";}
					if (($(this).find("value").size() > 0) && ($(this).find("label").size() > 0)) {
						dropdown += "<option value=" + CHAR_QUOTE + $(this).find("value").text() + CHAR_QUOTE + selected + ">" + $(this).find("label").text() + "</option>";
						if (thumbnails != "") {
							newImg = new Image();
							newImg.swrc = DB_SourcePath + thumbnailPath + $(this).find("value").text().replace(thumbnailSourceExtension, thumbnailExtension);
							UI_Thumbnails[field][$(this).find("value").text()] = newImg;
						}
					}
					else {
						dropdown += "<option value=" + CHAR_QUOTE + $(this).text() + CHAR_QUOTE + selected + ">" + $(this).text() + "</option>";	
					}
				});
				var otheroption = {};
				if ($(this).find("other").size() > 0) {
					otheroption["include"] = true;
					selected = "";
					if (($(spec[field]).val() != "") && (dropdown.indexOf(CHAR_QUOTE + " selected>") < 0)) {selected = " selected";}
					dropdown += "<option value=OTHER" + selected + ">Other...</option>";
					if ($(this).find("size").size() > 0) {otheroption["size"] = $(this).find("size").text();}
					if ($(this).find("maxlength").size() > 0) {otheroption["maxlength"] = $(this).find("maxlength").text();}
				}
				dropdown += "</select>";
				node.append(dropdown);
				if (otheroption["include"]) {
					var html = "<input type=text id=wfoOther_" + field;
					if (otheroption["size"] != undefined) {html += " size=" + otheroption["size"];}
					if (otheroption["maxlength"] != undefined) {html += " maxlength=" + otheroption["maxlength"];}
					if (($(spec[field]).val() != "") && (dropdown.indexOf(CHAR_QUOTE + " selected>") < 0)) {html += " value=" + CHAR_QUOTE + $(spec[field]).val() + CHAR_QUOTE;}
					html += ">";
					$("#wfoDropdown_" + field).after(html);
					$("#wfoOther_" + field).blur(function() {
						UI_updateOtherValue(field);
					});
				}
				$("#wfoDropdown_" + field).change(function() {
					UI_updateDropdownValue(field);
				});
				if (thumbnails) {
					$("#wfoDropdown_" + field).change(function() {
						UI_updateDropdownThumbnail(field);
					});
				}
				if ($(this).find("dynamic").size() > 0) {
					UI_DynamicDrops.push(field);
					UI_DynamicDropsVals.push($(spec[field]).val());
				}
				$("#wfoDropdown_" + field).change();
				break;
			// Format field for text
			case "text":
				if ($(this).find("sharerow").size() > 0) {UI_shareRow(node, $(this).find("sharerow").text());}
				else {UI_createRow(node, field, $(this).children("label").text());}
				if ($(this).find("default").size() > 0) {UI_setFieldDefault(field, $(this).find("default").text());}
				break;
			case "tel":
				if ($(this).find("sharerow").size() > 0) {UI_shareRow(node, $(this).find("sharerow").text());}
				else {UI_createRow(node, field, $(this).children("label").text());}
				$(spec[field]).hide();
				var html = "<input type=text id=" + CHAR_QUOTE + "wfoTelephone_" + field + CHAR_QUOTE;
				if ($(spec[field]).val() != "") {html += " value=" + CHAR_QUOTE + $(spec[field]).val() + CHAR_QUOTE;}
				else if ($(this).find("default").size() > 0) {html += " value=" + CHAR_QUOTE + $(this).find("default").text() + CHAR_QUOTE;}
				html += ">";
				node.append(html);
				$("#wfoTelephone_" + field).width((11 * 8) + "px").attr("maxLength", 12);
				$("#wfoTelephone_" + field).keyup(function() {
					UI_updateTelephoneValue(field);
				});
				$("#wfoTelephone_" + field).keyup();
				break;
			// Format field for check box
			case "checkbox":
				if ($(this).find("sharerow").size() > 0) {UI_shareRow(node, $(this).find("sharerow").text());}
				else {UI_createRow(node, field, $(this).children("label").text());}
				$(spec[field]).hide();
				var noFalse = false;
				if ($(this).find("nofalse").size() > 0) {noFalse = true;}
				var checked = "";
				if ($(spec[field]).val() == "true") {checked = " checked";}
				else if ($(this).find("default").size() > 0) {
					if (($(this).find("default").text() == "true") && ($(spec[field]).val() == "")) {checked = " checked";}
				}
				var html = "<input type=checkbox id=wfoCheckbox_" + field + checked + ">";
				node.append(html);
				$("#wfoCheckbox_" + field).click(function() {
					UI_updateCheckboxValue(field, noFalse);
				});
				UI_updateCheckboxValue(field, noFalse);
				break;
			// Format field for hidden
			case "hidden":
				$(spec[field]).hide();
				node.appendTo("#wfoForm");
				if ($(this).find("default").size() > 0) {UI_setFieldDefault(field, $(this).find("default").text());}
				break;
			// Format field for file (includes stripping of Four51 upload instructions)
			case "file":
					var upNode = {};
					var showInstructions = ($(this).find("showInstructions").size() > 0) ? true : false;
					$("div[id$='_divFileUpload']").each(function() {
						node = $(this).parent();
						id = $(node).attr("id");
						specID = id.substring(id.lastIndexOf("pageTpl_")).replace("pageTpl_","");
						upNode[specID] = $(this).parent();
						if (!showInstructions){
							if (specID == field) {
								$("#" + id + "_file_divRestrictions").remove();
							}
						}
					});
					if (specID.length > 0) {
						if ($(this).find("sharerow").size() > 0) {
							UI_shareRow(upNode[field], $(this).find("sharerow").text());
						}
						else {
							UI_createRow(upNode[field], field, $(this).children("label").text());
						}
					}
				break;
		}
		// Common formatting for all field types
		if ($(this).find("size").size() > 0) {UI_setFieldSize(field, $(this).find("size").text());}
		if ($(this).find("maxlength").size() > 0) {$(spec[field]).attr("maxLength", $(this).find("maxlength").text());}
		if ($(this).find("required").size() > 0) {
			UI_requiredFields[field] = $(this).find("required").text();
			$("#wfoLabel_" + field).css("color", "Red");
			if ($("#wfoFormInstructionsRequired").size() < 1) {
				$("#wfoForm").prepend("<span id=wfoFormInstructionsRequired>Fields in <span style='color: Red;'>red</span> are required.</span>");
			}
		}
		if ($(this).find("instructions").size() > 0) {$("#wfoInstructions_" + field).html($(this).find("instructions").text());}
		if ($(this).find("instructionsabove").size() > 0) {
			row = "<tr id=wfoRowInstructions_" + field + "><td>&nbsp;</td><td>&nbsp;</td><td colspan=2>" + $(this).find("instructionsabove").text() + "</td></tr>";
			$("#wfoRow_" + field).before(row).addClass("Instructions");
		}
		if ($(this).find("instructionsbelow").size() > 0) {
			row = "<tr id=wfoRowInstructions_" + field + " class=Instructions><td>&nbsp;</td><td>&nbsp;</td><td colspan=2>" + $(this).find("instructionsbelow").text() + "</td></tr>";
			$("#wfoRow_" + field).after(row);
		}
		if ($(this).find("prefix").size() > 0) {
			span = "<span id=wfoPrefix_" + field + ">" + $(this).find("prefix").text() + "</span>";
			node.prepend(span);
		}
		if ($(this).find("suffix").size() > 0) {
			span = "<span id=wfoSuffix_" + field + ">" + $(this).find("suffix").text() + "</span>";
			node.append(span);
		}
		if ($(this).find("sharecolor").size() > 0) {
			$("#wfoRow_" + field).addClass("Instructions");
		}
		if ($(this).find("disabled").size() > 0) {
			$(spec[field]).attr({disabled: "true"});
			$("#wfoDropdown_" + field).attr({disabled: "true"});
			UI_disabledFields[UI_disabledFields.length] = field;
		}
		if ($(this).find("lowercase").size() > 0)
		{
			$(spec[field]).keyup(function(){
			val = $(spec[field]).val();
			val = val.toLowerCase();
			$(spec[field]).val(val);
			});
		}
		if ($(this).find("uppercase").size() > 0)
		{
			$(spec[field]).keyup(function(){
			val = $(spec[field]).val();
			val = val.toUpperCase();
			$(spec[field]).val(val);
			});
		}
		if ($(this).find("alpha").size() > 0)
		{
			$(spec[field]).keyup(function(){
			val = $(spec[field]).val();
			pattern = new RegExp('[^a-zA-Z]+', 'g');
			val = val.replace(pattern, '');
			$(spec[field]).val(val);
			});
		}
		if ($(this).find("numeric").size() > 0)
		{
			$(spec[field]).keyup(function(){
			val = $(spec[field]).val();
			pattern = new RegExp('[^0-9]+', 'g');
			val = val.replace(pattern, '');
			$(spec[field]).val(val);
			});
		}
		if ($(this).find("alphanumeric").size() > 0)
		{
			$(spec[field]).keyup(function(){
			val = $(spec[field]).val();
			pattern = new RegExp('[^a-zA-Z0-9]+', 'g');
			val = val.replace(pattern, '');
			$(spec[field]).val(val);
			});
		}
		if ($(this).find("counter").size() > 0)
		{
			var max = $(this).find("counter").text();
			$("#wfoInstructions_" + field).append('<p id=wfoCounter_' + field + '></p>');
			$(spec[field]).attr("maxLength", max);
			$(spec[field]).keyup(function(){
				message = "Max length is " + max + " characters.";
				if ($(this).val() != "") { 
					count = max - $(this).val().length;
					message += " (" + count + " left)";
				}
				$("#wfoCounter_" + field).html(message);
			});
			$(spec[field]).keyup();
		}

		if ($(this).find("showrow").size() > 0) {
		    key = $(this).find("showrow").children("selectkey").text();
			var vals = []; 
			$(this).find("showrow").children("case").each(function(i){
				vals[i] = $(this).text();
			});
			$(spec["wfoField_" + key]).click(function(){showHide();UI_colorRows();});
			function showHide(){
				for (i=0;i<vals.length;i++){
					if (vals[i] == $(spec[key]).val()){$("#wfoRow_" + field).show();break;}				
					else {$("#wfoRow_" + field).hide();}
				}
			}
			showHide();
		}
		if ($(this).find("calendar").size() > 0)
		{
/*
			if (UI_ScriptFound == false){
				path = '/Themes/Custom/DABAB82A-1302-4CC0-B5E6-55D349494117/workflow_specform_images/Calendar/';
				$("#wfoForm").prepend('<script type="text/javascript" src="' + path + 'calendar.js"></script>');
				$("#wfoForm").prepend('<link rel="stylesheet" type="text/css" href="' + path + 'ui.datepicker.css" />');
				UI_ScriptFound = true;
			}
*/
			format = $(this).find("calendar").text();
			addFormat = "mm/dd/yy"
			if (format != ""){addFormat = format;}
			$(spec[field]).datepicker({  
        		dateFormat: addFormat,  
       	 		showOn: "both",  
       			buttonImage: DB_SourcePath + "Calendar/calendar.gif",  
       			buttonImageOnly: true}); 
		}   		

	});
	
	// Load databases as defined in the configuration XML
	$("database", response).each(function() {
		var table, name;
		if ($(this).find("source").size() > 0) {
			table = $(this).find("source").text().replace(".txt", "");
			DB[table] = new oDatasource();
			DB[table].Source = $(this).find("source").text();
			DB_init(table);
		}
		if ($(this).find("field").size() > 0) {
			if ($(this).find("table").size() > 0) {
				table = $(this).find("table").text();
			}
			if ($(this).find("name").size() > 0) {
				name = $(this).find("name").text();
			}
			else {name = $(this).find("field").text();}
			DB_Populate[name] = new oDatapopulate();
			DB_Populate[name].Table = table;
			DB_Populate[name].Field = $(this).find("field").text();
			DB_Populate[name].Display = $(this).find("display").text();
			DB_Populate[name].Sort = $(this).find("sort").text();
			DB_Populate[name].Key = $(this).find("key").text();
			$(this).find("target").each(function() {
				DB_Populate[name].Targets[$(this).find("form").text()] = $(this).find("db").text();
			});
		}
	});
	
	// Insert custom scripts
	$("script", response).each(function() {
		if (window.execScript) {
			window.execScript($(this).text());
		}
		else {
			html = "<script type=text/javascript>" + $(this).text() + "</script>";
			$("#wfoForm").append(html);
		}
	});
	
	// Show the preview image if the customer REALLY wants to
	if ($("showpreview", response).size() > 0) {
		UI_ShowPreview = true;
	}

	// Add special characters button above form (below Main Instructions)
	$("specialchars", response).each(function() {
		var charFile = $(this).text() || "";
		$("#wfoForm").prepend('<div id="specialChars"><input type="button" id ="specialCharsButton" value="Special Characters" /></div>');
		$("#specialChars").css("padding", "5px 0 5px 0");
		$("#specialCharsButton").click(function(){
			UI_openAccentWindow(charFile);
		});
	});
	
	// Insert top and bottom instructions
	if ($("maininstructions", response).size() > 0){addInst('maininstructions', 'wfoMainInstructions');}
	if ($("maininstructionsbottom", response).size() > 0){addInst('maininstructionsbottom', 'wfoMainInstructionsBottom');}

	function addInst(instructions, div)
	{
		if ($(instructions, response).find("text").size() > 0) {
			inst = $(instructions, response).find("text").text();
			if (instructions == 'maininstructions'){$("#wfoForm").prepend('<div id="' + div + '">' + inst + "</div>");}
			if (instructions == 'maininstructionsbottom'){
				$("#wfoForm").append('<div id="' + div + '">' + inst + "</div>");}
		}
		curDiv = '#' + div;
		if ($(instructions, response).find("textcolor").size() > 0) {
			val = $(instructions, response).find("textcolor").text();
			$(curDiv).css("color", val);
		}
		if ($(instructions, response).find("bgcolor").size() > 0) {
			val = $(instructions, response).find("bgcolor").text();
			$(curDiv).css("background-color", val);
		}
		if ($(instructions, response).find("padding").size() > 0) {
			val = $(instructions, response).find("padding").text();
			$(curDiv).css("padding", val);
		}
	}
	
	if ($("nocolor", response).size() > 0){UI_ColorRows = false;}
	

	// Clean up after creation of wfoTable
	$("#wfoForm>table").not("#wfoTable").remove();
	$("#wfoForm>br").remove();
	if (UI_ColorRows) UI_colorRows();
	UI_busy["UI_format"] = false;
}

// Used by heartbeat. Checks to see if any UI Engine processes are running and
// if not displays the form
function UI_checkFormStatus() {
	var busy = false;
	for (var process in UI_busy) {
		if (UI_busy[process]) {
			busy = true;
			return;
		}
	}
	for (var table in DB) {
		if (!DB[table].Loaded) {
			busy = true;
			return;
		}
	}
	for (var table in DB_Populate) {
		if (!DB_Populate[table].Loaded) {
			busy = true;
			DB_populateList(table);
			return;
		}
	}
	if (!busy) {
		$("#wfoStatus").hide();
		if (UI_ShowPreview) {$(".ProductImage").show();}
		$("#wfoForm").show();
		clearInterval(UI_heartbeat);
		if (typeof(UI_customInit) != "undefined") {UI_customInit();}
	}
}

// Used by UI_format to create table rows for form fields
function UI_createRow(node, field, label) {
	UI_busy["UI_createRow"] = true;
	var row = "<tr id=wfoRow_" + field + "><td id=wfoLabel_" + field + ">" + label + "</td><td>&nbsp;</td><td id=wfoField_" + field + "></td><td id=wfoInstructions_" + field + ">&nbsp;</td></tr>";
	$("#wfoTable").append(row);
	$("#wfoField_" + field).append(node);
	UI_busy["UI_createRow"] = false;
}

// Applies alternating background color to table rows
function UI_colorRows() {
    UI_busy["UI_colorRows"] = true;
    count = 0;
    $("#wfoTable>tbody>tr").not(".Instructions").each(function (i) {
        if ($(this).css("display") != "none") {
            count++;
            if (Math.pow(-1, count) < 0) {$(this).css("background-color","#EEEEEE");}
            else {$(this).css("background-color","#FFFFFF");}
        }
    });
    $("#wfoTable>tbody>tr.Instructions").each(function() {        
 
$(this).css("background-color",$(this).prev().css("background-color"));
    });
    UI_busy["UI_colorRows"] = false;
} 

// Used by UI_format to append a form field into an existing row
function UI_shareRow(node, field) {
	UI_busy["UI_shareRow"] = true;
	$("#wfoField_" + field).append(node);
	UI_busy["UI_shareRow"] = false;
}

// Sets width of field using standard conversion factor (8 pixels per character)
function UI_setFieldSize(field, size) {
	$(spec[field]).width((size * 8) + "px");
}

// Sets the default value of a field
function UI_setFieldDefault(field, val) {
	if ($(spec[field]).val() == "") {$(spec[field]).val(val);}
}

// Main validation handler and form cleanup
function UI_validateForm() {
	for (i = 0; i < UI_disabledFields.length; i++) {$(spec[UI_disabledFields[i]]).attr({disabled: ""});}
	for (var field in UI_requiredFields) {if (!UI_validateRequired(field)) {return false;}}
	if (typeof(UI_customValidate) != "undefined") {if (!UI_customValidate()) {return false;}}
	return true;
}
	
// Validates required fields
function UI_validateRequired(field) {
	if ($(spec[field]).val() == "") {
		alert(UI_requiredFields[field]);
		return false;
	}
	return true;
}
	
// Event handler for checkboxes
function UI_updateCheckboxValue(field, noFalse) {
	if ($("#wfoCheckbox_" + field)[0].checked) {$(spec[field]).val("true");}
	else {
		if (noFalse) $(spec[field]).val("");
		else $(spec[field]).val("false");
	}
}
	
// Event handler for select fields
function UI_updateDropdownValue(field) {
	if ($("#wfoDropdown_" + field).val() == "OTHER") {
		$("#wfoOther_" + field).show();
		if ((!UI_busy["UI_init"]) && (!UI_busy["UI_format"])) {$("#wfoOther_" + field).focus();}
	}
	else {
		$("#wfoOther_" + field).hide();
		$(spec[field]).val($("#wfoDropdown_" + field).val());
	}
}

// Event handler for select fields with thumbnail option
function UI_updateDropdownThumbnail(field) {
	if ($("#wfoDropdown_" + field).val() != "") {
		$("#wfoThumbnail_" + field).attr("id", UI_Thumbnails[field][$("#wfoDropdown_" + field).val()].src).show();
	}
	else {$("#wfoThumbnail_" + field).hide();}
}
	
// Event handler for telephone fields
function UI_updateTelephoneValue(field) {
	var val = $("#wfoTelephone_" + field).val();
	if (val != "") {
		val = val.replace(/\s/g, "");
		$(spec[field]).val(val);
		val = val.replace(/(\w{3})?(\w{3})?(\w{4})?/, "$1" + ((val.length > 3)?" ":"") + "$2" + ((val.length > 6)?" ":"") + "$3");
		$("#wfoTelephone_" + field).val(val);
	}
}

// Event handler for other fields
function UI_updateOtherValue(field) {
	if (($("#wfoDropdown_" + field).val() == "OTHER") && ($("#wfoOther_" + field).val() != "")) {$(spec[field]).val($("#wfoOther_" + field).val());}
}

function UI_openAccentWindow(accentFile) {
	var accentFile = accentFile || "accent.htm";
	var accentPath = DB_SourcePath + accentFile;
	var oWindow;
	oWindow = window.open(accentPath,null,"directories=no,width=400,height=500,location=no,menubar=yes,toolbar=no,scrollbars=yes,status=no");
}

function UI_SetDynamicDrops(){
	$(UI_DynamicDrops).each(function(i){
		$("#wfoDropdown_" + this).val(UI_DynamicDropsVals[i]);
		$("#wfoDropdown_" + this).change();
	});		
}

// Determines if value exists in array
function UI_ValueInArray(val, array){
	var foundVal = false
	$(array).each(function(){
		if (this == val) foundVal = true;
	});
	return foundVal;
}

function oDatasource() {
	this.Source = "";
	this.Dataset;
	this.Columns = [];
	this.Loaded = false;
}

function oDatapopulate() {
	this.Table = "";
	this.Field = "";
	this.Display = "";
	this.Sort = "";
	this.Key = "";
	this.Targets = {};
	this.Loaded = false;
}

function DB_init(table) {
	UI_busy["DB_init"] = true;
	var datasource = DB_SourcePath + DB[table].Source + RANDOMURL;
	UI_busy["DB_get"] = true;
	// Load the file
	$.get(datasource, function(response) {
		DB_loadData(response, table);
		UI_busy["DB_get"] = false;
	});
	UI_busy["DB_init"] = false;
}

function DB_loadData(response, table) {
	UI_busy["DB_loadData"] = true;
	// Split into rows
	DB[table].Dataset = response.split(CHAR_LINEBREAK);
	// Split into columns per row
	for (var i = 0; i < DB[table].Dataset.length; i++) {DB[table].Dataset[i] = DB[table].Dataset[i].split(CHAR_TAB);}
	// Keep track of column field names in a seperate array and remove columns without field name
	for (var col = 0; col < DB[table].Dataset[0].length; col++) {
		DB[table].Dataset[0][col] = DB_cleanData(DB[table].Dataset[0][col]);
		if ((DB[table].Dataset[0][col] == undefined) || (DB[table].Dataset[0][col] == "")) {
			for (var row = 1; row < DB[table].Dataset.length; row++) {DB[table].Dataset[row].splice(col, 1);}
			continue;
		}
		DB[table].Columns[DB[table].Columns.length] = DB[table].Dataset[0][col];
	}
	// Clean up the "database" for empty rows and remove header column
	var datatemp = [];
	for (var row = 1; row < DB[table].Dataset.length; row++) {
		var empty = true;
		var tempdata = {};
		for (var col = 0; col < DB[table].Dataset[row].length; col++) {
			if (DB[table].Dataset[row][col] == undefined) {DB[table].Dataset[row][col] = "";}
			DB[table].Dataset[row][col] = DB_cleanData(DB[table].Dataset[row][col]);
			tempdata[DB[table].Columns[col]] = DB[table].Dataset[row][col];
			if (DB[table].Dataset[row][col] != "") {empty = false;}
		}
		if (!empty) {datatemp[datatemp.length] = tempdata;}
	}
	DB[table].Dataset = datatemp;
	DB[table].Loaded = true;
	UI_busy["DB_loadData"] = false;
}

// Trims database fields of extraneous spaces and for formatting specific to tab delimited text files
function DB_cleanData(val) {
	UI_busy["DB_cleanData"] = true;
	// Trim spaces
	val = val.replace(/\s*((\S+\s*)*)/, "$1");
	val = val.replace(/((\s*\S+)*)\s*/, "$1");
	// Cells from Excel of type "text" have quotes we must process
	if (val.charCodeAt(0) == 34) {val = val.slice(1);}
	if (val.charCodeAt(val.length - 1) == 34) {val = val.slice(0, (val.length - 1));}
	// Convert double escaped quotes
	while (val.indexOf(CHAR_QUOTE + CHAR_QUOTE) > -1) {val = val.replace((CHAR_QUOTE + CHAR_QUOTE), CHAR_QUOTE);}
	UI_busy["DB_cleanData"] = false;
	return val;
}

// Custom sort algorithm
function DB_sortData(table, field) {
	UI_busy["DB_sortData"] = true;
	var dataset = DB[table].Dataset;
	dataset = dataset.sort(function(a,b) {
		x = a[field].toLowerCase();
		y = b[field].toLowerCase();
		return ((x < y) ? -1 : ((x > y) ? 1 : 0));
	});
	DB[table].Dataset = dataset;
	UI_busy["DB_sortData"] = false;
}

// Populate the drop-down with record information
function DB_populateList(name) {
	UI_busy["DB_populateList"] = true;
	// Sort the data by a column defined in the setup
	DB_sortData(DB_Populate[name].Table, DB_Populate[name].Sort);
	var node = $(spec[DB_Populate[name].Field]).parent();
	$(spec[DB_Populate[name].Field]).hide();
	var html = "<select name=wfoDropdown_" + DB_Populate[name].Field + " id=wfoDropdown_" + DB_Populate[name].Field + "><option value=" + CHAR_QUOTE + CHAR_QUOTE + "></option>";
	// Populate the list
	for (var row = 0; row < DB[DB_Populate[name].Table].Dataset.length; row++) {
		selected = "";
		if ($(spec[DB_Populate[name].Field]).val() == DB[DB_Populate[name].Table].Dataset[row][DB_Populate[name].Key]) {selected = " selected";}
		html += "<option value=" + CHAR_QUOTE + DB[DB_Populate[name].Table].Dataset[row][DB_Populate[name].Key] + CHAR_QUOTE + selected + ">" + DB[DB_Populate[name].Table].Dataset[row][DB_Populate[name].Display] + "</option>";
	}
	html += "</select>";
	node.append(html);
	if ($(spec[DB_Populate[name].Field]).val() == "") {document.getElementById("wfoDropdown_" + DB_Populate[name].Field).selectedIndex = 0;}
	$("#wfoDropdown_" + DB_Populate[name].Field).change(function() {
		DB_populateForm(name);
	});
	if (html.indexOf(" selected>") > -1) {$("#wfoDropdown_" + DB_Populate[name].Field).change();}
	DB_Populate[name].Loaded = true;
	UI_busy["DB_populateList"] = false;
}

// Find the record and populate the form fields with the resulting data
function DB_populateForm(name) {
	var val = $("#wfoDropdown_" + DB_Populate[name].Field).val();
	$(spec[DB_Populate[name].Field]).val(val);
	for (var row = 0; row < DB[DB_Populate[name].Table].Dataset.length; row++) {
		if (DB[DB_Populate[name].Table].Dataset[row][DB_Populate[name].Key] == val) {
			for (var field in DB_Populate[name].Targets) {
				if ($("#wfoDropdown_" + field).size() > 0) {
					$("#wfoDropdown_" + field + ">option").each(function(i) {
						if ($(this).val() == DB[DB_Populate[name].Table].Dataset[row][DB_Populate[name].Targets[field]]) {
							// document.getElementById("wfoDropdown_" + field).selectedIndex = i;
							$("#wfoDropdown_" + field)[0].selectedIndex = i;
							$("#wfoDropdown_" + field).change();
						}
					});
				}
				else if ($("#wfoTelephone_" + field).size() > 0) {
					$("#wfoTelephone_" + field).val(DB[DB_Populate[name].Table].Dataset[row][DB_Populate[name].Targets[field]]).keyup();
				}
				else {$(spec[field]).val(DB[DB_Populate[name].Table].Dataset[row][DB_Populate[name].Targets[field]]);}
			}
		}
	}
}
