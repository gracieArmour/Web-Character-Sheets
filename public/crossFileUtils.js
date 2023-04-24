// cookie management
function setCookie(name,value) {
	const currentDate = new Date();
	const expireDate = new Date(currentDate.setDate(currentDate.getDate() + 1)).toUTCString();
	document.cookie = name + '=' + JSON.stringify(value) + '; expires=' + expireDate +';';
}

function getCookie(name) {
	var match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    if (match) return match[2];
}

function getCookie(name) {
    var match = document.cookie.match(RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return match ? match[1] : null;
}


// save fetch
async function sendSave(data) {
	var response = await fetch('/save_character', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	var responseText = await response.text();

    return responseText;
}

// share fetch
async function sendShare(sys,event) {
	var shareUser = document.getElementById("share-username");
	var existingUsers = [...document.querySelectorAll(".shared-entry label")];
	var characterSheet = document.getElementById("character-sheet");
    var o = {newUser: shareUser.value, existingUsers: existingUsers.map(elem => elem.textContent)};
	
    var shareResponse = await fetch('/share_character/'+sys+'/'+characterSheet.dataset.charid, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(o)
    });
    var shareReply = await shareResponse.text();

    if (shareReply=="Shared successfully") {
        location.reload();
    }else {
        document.getElementById("share-message").textContent = shareReply;
    }
    console.log(shareReply);
}

// misc
function normalizeStr(str) {
	var normal = isNaN(Number(str)) ? str : Number(str);
	return normal;
}

if (typeof module !== 'undefined') {
	module.exports = {setCookie, getCookie, makeAutosave, sendSave, sendShare, normalizeStr};
}