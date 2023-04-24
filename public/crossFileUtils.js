// cookie management
function setCookie(name,value) {
	const currentDate = new Date();
	const expireDate = new Date(currentDate.setDate(currentDate.getDate() + 1)).toUTCString();
	document.cookie = name + '=' + JSON.stringify(value) + '; expires=' + expireDate +';';
    console.log(document.cookie);
}

function getCookie(name) {
	var match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    if (match) return match[2];
}

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

function normalizeStr(str) {
	var normal = isNaN(Number(str)) ? str : Number(str);
	return normal;
}


module.exports = {setCookie, getCookie, sendSave, normalizeStr};