var importRegex = /^(import)/
var packageNameExcludingClassRegex = /(.*\.)/
var validClassNameRegex = /^(\s+)?[A-Z]{1}[\S]+(\(|\.|>|\s|$)/;

var basePackageRegex;

var browseableClasses = new Array();
var currentDirectoryBroweseableClasses = new Array();

var xhr = new XMLHttpRequest();

var protocol;
var domain;
var userName;
var repoName;
var branch;
var moduleName;
var srcFolder;
var repoPath;

var lastImportStatementIndex = -1;

var githubContentApiBaseUrl = "https://api.github.com/repos";

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse){
	if(msg.task && (msg.task == "suggestClassLink")) {
		protocol = msg.protocol;
		domain = msg.domain;
		userName = msg.userName;
		repoName = msg.repoName;
		branch = msg.branchName;
		moduleName = msg.moduleName;
		srcFolder = msg.srcFolder;
		repoPath = msg.repoPath;

		var contentApiUrl = githubContentApiBaseUrl + "/" + userName + "/" + repoName + "/contents/" + repoPath;
		console.log("calling " + contentApiUrl);
		$.ajax({
			type 	: "GET",
			url 	: contentApiUrl,
			contentType: "application/json; charset=utf-8",
			dataType: "json",
			success : function(data, status, jqXHR){
				for(var i=0; i<data.length; i++){
					var className = data[i].name.split(".")[0];
					var currentDirectoryBrowseableClass = new CurrentDirectoryBrowseableClass(className, data[i].html_url);
					currentDirectoryBroweseableClasses.push(currentDirectoryBrowseableClass);
				}

				console.log(currentDirectoryBroweseableClasses);

				for(var i=0; i<currentDirectoryBroweseableClasses.length; i++) {
					console.log(currentDirectoryBroweseableClasses[i].className + " " + currentDirectoryBroweseableClasses[i].classHtmlUrl );
					var elem = $('td :contains(' + currentDirectoryBroweseableClasses[i].className + ')');
					for(var j = 0; j<elem.length; j++) {
						var code = $(elem[j]).text();
						var result = code.match(validClassNameRegex);
						if (result) {
							if(~code.indexOf('List') || ~code.indexOf('ArrayList') || ~code.indexOf('Set') || ~code.indexOf('Iterator')) {
								$(elem[j]).wrapInner('<a href=\"' + currentDirectoryBroweseableClasses[i].getGithubUrl() + '\" target=\"_blank\" />');
							} else if (code.length == currentDirectoryBroweseableClasses[i].className.length) {
								$(elem[j]).wrapInner('<a href=\"' + currentDirectoryBroweseableClasses[i].getGithubUrl() + '\" target=\"_blank\" />');
							}
						}
					}
				}
			},
			error	: function(data, status, jqXHR){
				console.log(data);
			}
		});

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
			var className = browseableClasses[i].className;
			var url = browseableClasses[i].getGithubUrl();
			checkLinkExists(className, url);
		}
	}
});

function checkLinkExists(className, url) {
	jQuery.ajax({
		type : "HEAD",
		url :  url,
		success: function(data, status, jqXHR){
			innerwrap = '<a href=\"' + url + '\" target=\"_blank\" />';
			linkifyClass(true, className, innerwrap);
		},

		error: function(data, status, jqXHR) {
			innerwrap = '<a href=\"' + url + '\" target=\"_blank\" />';
			linkifyClass(false, className, innerwrap);
		}
	});
}

function linkifyClass(isValidUrl, className, innerwrap) {
	var elem = $('td :contains(' + className + ')');
	for(var j = 0; j<elem.length; j++) {
		var code = $(elem[j]).text();
		var result = code.match(validClassNameRegex);

		console.log(innerwrap);
		if (result) {
			if(~code.indexOf('List') || ~code.indexOf('ArrayList') || ~code.indexOf('Set') || ~code.indexOf('Iterator')) {
				$(elem[j]).wrapInner(innerwrap);
			} else if (code.length == className.length) {
				$(elem[j]).wrapInner(innerwrap);
			}
		}

		if(!isValidUrl) {
			$(elem[j]).attr('title', className + ' is a @Generated Java class');
			
			$(elem[j]).click(function(event){
				event.preventDefault();
				alert(className + ' is a @Generated Java class');
			});
		}
	}
}

function CurrentDirectoryBrowseableClass(className, classHtmlUrl) {
	this.className = className;
	this.classHtmlUrl = classHtmlUrl;
}

CurrentDirectoryBrowseableClass.prototype.getGithubUrl = function() {
	return this.classHtmlUrl;
}

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
