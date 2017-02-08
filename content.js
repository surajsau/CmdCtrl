var importRegex = /^(import)/
var packageNameExcludingClassRegex = /(.*\.)/
var validClassNameRegex = /^(\s+)?[A-Z]{1}[\S]+(\(|\.|>|\s|$)/;

var basePackageRegex;

var browseableClasses = new Array();

var protocol;
var domain;
var userName;
var repoName;
var branch;
var moduleName;
var srcFolder;

var lastImportStatementIndex = -1;

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse){
	if(msg.task && (msg.task == "suggestClassLink")) {
		protocol = msg.protocol;
		domain = msg.domain;
		userName = msg.userName;
		repoName = msg.repoName;
		branch = msg.branchName;
		moduleName = msg.moduleName;
		srcFolder = msg.srcFolder;

		var packageNameFolders = msg.packageName.split(".");

		basePackageRegex = new RegExp('(' + packageNameFolders[0] + '\.' + packageNameFolders[1] + ')');

		var tableRows = $('div.blob-wrapper tr');
		$(tableRows).each(function(index) {
			var code = $(this).find(':nth-child(2)').text();
			if(isItImportStatement(code)) {
				var packageName = getPackageName(code);
				if(packageBelongsToCurrentSourceCode(packageName)) {
					var className = getClassName(packageName);
					if(className !== 'R') {
						var browseableClass = new BrowseableClass(className, packageName);
						browseableClasses.push(browseableClass);
					}
				}

				if(lastImportStatementIndex < index) {
					lastImportStatementIndex = index;
				}
			}
		});

		for(var i=0 ; i<browseableClasses.length; i++) {
			var elem = $('td :contains(' + browseableClasses[i].className + ')');
			for(var j = 0; j<elem.length; j++) {
				var code = $(elem[j]).text();
				var result = code.match(validClassNameRegex);
				if (result) {
					if(~code.indexOf('List') || ~code.indexOf('ArrayList') || ~code.indexOf('Set') || ~code.indexOf('Iterator')) {
						$(elem[j]).wrapInner('<a href=\"' + browseableClasses[i].getGithubUrl() + '\" target=\"_blank\" />');
					} else if (code.length == browseableClasses[i].className.length) {
						$(elem[j]).wrapInner('<a href=\"' + browseableClasses[i].getGithubUrl() + '\" target=\"_blank\" />');
					}
				}
			}
		}
	}
});

function BrowseableClass(className, packageName) {
	this.className = className;
	this.packageName = packageName;
}

BrowseableClass.prototype.getGithubUrl = function(){

	var result = this.packageName.match(packageNameExcludingClassRegex);
	var packageNameWithSlashes = result[0].replace(/\./g, "\/");
	return protocol + "://" + domain + "/" + userName + "/" + repoName
					+ "/blob/" + branch + "/" + moduleName + "/" + srcFolder
					+ "/" + packageNameWithSlashes + this.className + ".java";

}

function isItImportStatement(lineOfCode) {
	var result = lineOfCode.match(importRegex);
	if(result)
		return true;
	else
		return false;
}

function packageBelongsToCurrentSourceCode(packageName) {
	var result = packageName.match(basePackageRegex);
	if(result)
		return true;
	else
		return false;
}

function getPackageName(importStatement) {
	var code = importStatement.split(" ");
	var packageName = code[1].split(";")[0];
	return packageName;
}

function getClassName(packageName) {
	var subPackagesAndClass = packageName.split(".");
	var className = subPackagesAndClass[subPackagesAndClass.length - 1];
	return className;
}