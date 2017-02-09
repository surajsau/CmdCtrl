chrome.tabs.onUpdated.addListener (function(tabId, changeInfo, tab){
	console.log("TAB ID : " + tabId);
	if(changeInfo.status == 'complete') {
		var baseUrl = "github.com";
		var tabUrl = tab.url;

		//--url belongs to githubs
		if(tabUrl.indexOf(baseUrl) > -1) {
			var sourceRegex = /^(https?):\/\/(github\.com)\/([\w]+)\/([\S]+)\/blob\/([\w]+)\/(.*)\/(src\/main\/java)\/(.*)\/([\w]+\.java)/;
			var result = tabUrl.match(sourceRegex);
			if(result) {
				var len = result.length;
				console.log(result);

				var protocol = result[1];
				var domain = result[2];
				var userName = result[3];
				var repoName = result[4];
				var branchName = result[5];
				var moduleName = result[6];
				var srcFolder = result[7];
				var className = result[len - 1];
				var packageNameWithSlashes = result[len - 2];
				var packageName = packageNameWithSlashes.replace(/\//g, ".");
				var repoPath = moduleName + "/src/main/java/" + packageNameWithSlashes;
				console.log("Package name : " + packageName);
				console.log("Class name : " + className);


				var msg = {
					task: "suggestClassLink",
			        protocol: protocol,
			        domain: domain,
			        userName: userName,
			        repoName: repoName,
			        branchName: branchName,
			        moduleName: moduleName,
			        srcFolder: srcFolder,
			        packageName: packageName,
			        repoPath: repoPath
				}

				console.log(msg)

				chrome.tabs.sendMessage(tab.id, msg, function(loggedData){
					if(jQuery) {
						console.log('Jquery loaded');
						console.log(loggedData);
					} else {
						console.log('Jquery not loaded');
					}
				});
			}
		}
	}
});