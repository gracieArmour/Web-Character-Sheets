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

document.getElementById("add-basic-property-button").addEventListener("click", function () {
	let newHTML = Handlebars.templates.basicPropertyEntry({});
	var section = document.getElementById('basic-properties-list');
	section.insertAdjacentHTML('beforeend', newHTML);
});

// playbook search listeners
var playbookListDropdown = document.getElementById("playbook-dropdown");

document.getElementById("playbook-search").addEventListener("focusin", function () {
	playbookListDropdown.classList.remove("hidden");
	moveFilter();
});

document.getElementById("playbook-search").addEventListener("focusout", function () {
	playbookListDropdown.classList.add("hidden");
});

// equipment search listeners
var equipmentListDropdown = document.getElementById("equipment-dropdown");

document.getElementById("equipment-search").addEventListener("focusin", function () {
	equipmentListDropdown.classList.remove("hidden");
	moveFilter();
});

document.getElementById("equipment-search").addEventListener("focusout", function () {
	equipmentListDropdown.classList.add("hidden");
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

function textFilter(item,filter) {
	var invalid = false;
	
	// check if name contains current search input
	if (item.textContent.toUpperCase().indexOf(filter.toUpperCase()) > -1) {
		invalid = true;
	}

	return invalid;
}

function playbookFilter() {
	var dropdownList = [...document.getElementsByClassName("playbook-list-entry")];
	var filterText = document.getElementById("playbook-search").value;

	for (var i = 0; i < dropdownList.length; i++) {
		if (textFilter(dropdownList[i],filterText)) {
			dropdownList[i].style.display = "";
		} else {
			dropdownList[i].style.display = "none";
		}
	}
}

function equipmentFilter() {
	var dropdownList = [...document.getElementsByClassName("equipment-list-entry")];
	var filterText = document.getElementById("equipment-search").value;

	for (var i = 0; i < dropdownList.length; i++) {
		if (textFilter(dropdownList[i],filterText)) {
			dropdownList[i].style.display = "";
		} else {
			dropdownList[i].style.display = "none";
		}
	}
}

function moveFilter() {
	var dropdownList = [...document.getElementsByClassName("move-list-entry")];
	var filterText = document.getElementById("move-search").value;

	for (var i = 0; i < dropdownList.length; i++) {
		if (onpageFilter(dropdownList[i]) || rulesFilter(dropdownList[i]) || textFilter(dropdownList[i],filterText)) {
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