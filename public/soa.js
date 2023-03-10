// playbook data
var playbookMoveData = {};


// notes section
var simplemde = new SimpleMDE({ element: document.getElementById("character-notes") });


// listeners
document.getElementById("add-equipment-button").addEventListener("click", function () {
	let newHTML = Handlebars.templates.soaEquipmentEntry({});
	var section = document.getElementById('equipment-list');
	section.insertAdjacentHTML('beforeend', newHTML);
});

// move search listeners
var moveListDropdown = document.getElementById("move-dropdown");

document.getElementById("move-search").addEventListener("focusin", function () {
	moveListDropdown.classList.remove("hidden");
	moveFilter();
});

document.getElementById("move-search").addEventListener("focusout", function () {
	moveListDropdown.classList.add("hidden");
});

document.getElementById("add-move-button").addEventListener("click", function () {
	let newHTML = Handlebars.templates.soaMoveEntry({});
	var section = document.getElementById('move-list');
	section.insertAdjacentHTML('beforeend', newHTML);
});


// dropdown logic
function onpageFilter(item) {
	var moveData = playbookMoveData[item.dataset.moveid];
	var moveList = [...document.getElementsByClassName("move-entry")].map(elem => {elem.dataset.moveid});
	var invalid = false;
	
	// type selector
	var selectedType = document.getElementById("move-type-selector").value;
	if ((selectedType != "Any") && (moveData.type != selectedType)) {
		invalid = true;
	}

	var selectedPlaybook = document.getElementById("move-playbook-selector").value;
	if ((selectedPlaybook != "Any") && (moveData.playbook != selectedType)) {
		invalid = true;
	}

	// already have move
	if (moveList.includes(moveData.id)) {
		invalid = true;
	}

	return invalid;
}

function rulesFilter(item) {
	var classlessMode = !(document.getElementById("classless-toggle").checked);
	var moveData = playbookMoveData[item.dataset.moveid];
	var moveList = [...document.getElementsByClassName("move-entry")];
	var charLevel = document.getElementById("level-value").value;
	var invalid = false;

	// check if valid playbook
	if (!([...document.getElementsByClassName("playbook-entry")].map(elem => {elem.textContent}).includes(moveData.source)) && (moveData.source != "Custom")) {
		invalid = true;
	}

	// check if valid prereqs
	if (moveData.prereqLevel > charLevel) {
		invalid = true;
	}
	
	if (!(moveList.map(elem => {elem.dataset.moveid}).includes(moveData.prereqMove)) && (moveData.prereqMove != -1)) {
		invalid = true;
	}

	// check if second background available
	var backgroundList = moveList.filter(move => {move.dataset.type == "Background"}).map(elem => {elem.dataset.moveid});
	if ((backgroundList != []) && (moveData.type == "Background") && (charLevel < 6)) {
		invalid = true;
	}

	return invalid && classlessMode;
}

function textFilter(item) {
	var invalid = false;
	
	// check if name contains current search input
	if (item.textContent.toUpperCase().indexOf(document.getElementById("move-search").value.toUpperCase()) > -1) {
		invalid = true;
	}

	return invalid;
}

function moveFilter() {
	var dropdownList = [...document.getElementsByClassName("move-list-entry")];

	for (var i = 0; i < dropdownList.length; i++) {
		if (onpageFilter(dropdownList[i]) || rulesFilter(dropdownList[i]) || textFilter(dropdownList[i])) {
			dropdownList[i].style.display = "";
		} else {
			dropdownList[i].style.display = "none";
		}
	}
}

// var formElem = document.getElementById("character-sheet");
// var submitButton = document.getElementById("saveButton");

// submitButton.addEventListener('click',e => {
//     e.preventDefault();
//     var o = {};
//     new FormData( formElem ).forEach(( value, key ) => o[key] = value );
//     fetch('/save_character', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(o)
//     })
// })

// var header = document.getElementById("site-header");

// header.addEventListener('click', e => {
// 	console.log(simplemde.value());
// });

// header.addEventListener('click', e => {
//     fetch('/database', {
//         method: 'POST'
//     })
// });