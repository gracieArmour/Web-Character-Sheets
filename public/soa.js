console.log("soa js loaded");


// notes section
var simplemde = new SimpleMDE({ element: document.getElementById("character-notes") });
simplemde.togglePreview();

// DYNAMIC LISTENERS
function updateImg() {
	var charImg = document.getElementById("character-img");
	var newSrc = document.getElementById("character-img-input").value;
	charImg.src = newSrc;
	if (!newSrc) {
		charImg.style.height = "150px";
	}
}

function deleteHandler(elem,selector) {
	elem.closest(selector).remove();
}

function makeEquipmentEditable(elem) {
	var equipmentData = {
		id: elem.dataset.equipid,
		name: elem.querySelector(".item-name").textContent,
		description: elem.querySelector(".entry-description").textContent,
		uses: elem.querySelector(".item-uses input").value,
		type: elem.dataset.type,
		cost: elem.dataset.cost,
		is_custom: 1,
		link: elem.querySelector(".item-name").href,
		is_expanded: elem.querySelector(".collapse-button").textContent == "Collapse"
	}
	let newHTML = Handlebars.templates.soaCustomEquipmentEntry(equipmentData);
	elem.insertAdjacentHTML('afterend', newHTML);
	elem.remove();
	refreshListeners();
}

function makeMoveEditable(elem) {
	var moveData = {
		id: elem.dataset.moveid,
		name: elem.querySelector(".move-name").textContent,
		description: elem.querySelector(".entry-description").textContent,
		type: elem.dataset.type,
		is_custom: 1,
		link: elem.querySelector(".move-name").href,
		is_expanded: elem.querySelector(".collapse-button").textContent == "Collapse"
	}
	let newHTML = Handlebars.templates.soaCustomMoveEntry(moveData);
	elem.insertAdjacentHTML('afterend', newHTML);
	elem.remove();
	refreshListeners();
}

function collapseContent(elem) {
	var content = elem.closest(".entry").querySelector('.entry-info');
	if (content.style.maxHeight) {
		content.style.minHeight = null;
		content.style.maxHeight = null;
		elem.textContent = "Expand";
	} else {
		content.style.minHeight = "100px";
		content.style.maxHeight = content.scrollHeight + "px";
		elem.textContent = "Collapse";
	}
}

function shiftUp(elem) {
	var previous = elem.previousElementSibling;
	if (previous) {
		previous.insertAdjacentElement('beforebegin',elem);
		makeAutosave();
	}
}

function shiftDown(elem) {
	var next = elem.nextElementSibling;
	if (next) {
		next.insertAdjacentElement('afterend',elem);
		makeAutosave();
	}
}

var savables, equipmentEntries, equipCollapseButtons, moveEntries, moveCollapseButtons;
function refreshListeners() {
	equipCollapseButtons = [...document.getElementsByClassName("collapse-equipment-button")];
	equipmentEntries = [...document.getElementsByClassName("item-info")];

	moveCollapseButtons = [...document.getElementsByClassName("collapse-move-button")];
	moveEntries = [...document.getElementsByClassName("move-info")];

	savables = [...document.getElementsByClassName("savable")];
	savables.forEach(elem => {
		elem.removeEventListener("change",makeAutosave);
		elem.addEventListener("change", makeAutosave);
	});

	notesFields = [...document.getElementsByClassName("CodeMirror-wrap")];
	notesFields.forEach(elem => {
		elem.removeEventListener("change",makeAutosave);
		elem.addEventListener("change", makeAutosave);
	});
}
refreshListeners();

// save logic
function getCharData() {
	refreshListeners();
	var o = {
		basic_properties: [],
		playbooks: [],
		equipment: [],
		customEquips: [],
		moves: [],
		customMoves: []
	};
	var moveList = [...document.getElementsByClassName("move-entry")];
	var equipList = [...document.getElementsByClassName("item-entry")];

	savables.forEach(elem => {
		if (elem.classList.contains("save-img")) {
			o[elem.name] = elem.src.includes("localhost") ? "" : elem.src;
		}else if (elem.classList.contains("save-bProps")) {
			o['basic_properties'].push({name:elem.name,value:elem.value});
		}else if (elem.classList.contains("save-customProps")) {
			if (elem.querySelector(".new-basic-property-name").value) {
				o['basic_properties'].push({
					name: elem.querySelector(".new-basic-property-name").value,
					value: elem.querySelector(".new-basic-property-value").value
				});
			}
		}else if (elem.classList.contains("save-playbooks")) {
			o['playbooks'].push(elem.dataset.playbookname);
		}else if (elem.classList.contains("save-stats")) {
			o['stat_'+elem.id.split('-')[1].toLowerCase()] = Number(elem.querySelector('.stat-value').value);
			o['debility_'+elem.querySelector('.debility-container').id.split('-')[1].toLowerCase()] = elem.querySelector('.debility-checkbox').checked ? 1 : 0;
		}else if (elem.classList.contains("save-hp")) {
			o['current_hp'] = Number(elem.querySelector('#hp-slider').value);
			o['max_hp'] = Number(elem.querySelector('#hp-slider').max);
		}else if (elem.classList.contains("save-equipment")) {
			o['equipment'].push({
				id: Number(elem.dataset.equipid),
				uses: Number(elem.querySelector('.item-uses input').value),
				is_expanded: elem.querySelector(".collapse-button").textContent == "Collapse"
			});
		}else if (elem.classList.contains("save-customEquips")) {
			if (elem.querySelector('.item-name-container label input').value) {
				o['customEquips'].push({
					id: elem.dataset.equipid,
					name: elem.querySelector('.item-name-container label input').value,
					description: elem.querySelector('.entry-description').value,
					base_uses: Number(elem.querySelector('.item-uses input').value),
					cost: Number(elem.querySelector('.item-cost-container input').value),
					type: elem.querySelector('.item-name-container select').value,
					is_custom: 1,
					position: equipList.indexOf(elem),
					is_expanded: elem.querySelector(".collapse-button").textContent == "Collapse"
				});
			}
		}else if (elem.classList.contains("save-moves")) {
			o['moves'].push({
				id: Number(elem.dataset.moveid),
				is_expanded: elem.querySelector(".collapse-button").textContent == "Collapse"
			});
		}else if (elem.classList.contains("save-customMoves")) {
			if (elem.querySelector('.move-name-container label input').value) {
				var moveType, levelReq;
				switch (elem.querySelector('.move-name-container select').value) {
					case "Starting Character":
						moveType = "Character";
						levelReq = 0;
						break;
					case "5th Lvl Character":
						moveType = "Character";
						levelReq = 5;
						break;
					case "6th Lvl Advanced":
						moveType = "Advanced";
						levelReq = 6;
						break;
					default:
						moveType = elem.querySelector('.move-name-container select').value;
						levelReq = 0;
				}

				o['customMoves'].push({
					id: elem.dataset.moveid,
					name: elem.querySelector('.move-name-container label input').value,
					description: elem.querySelector('.entry-description').value,
					type: moveType,
					prereq_level: levelReq,
					prereq_move: 0,
					source: "Custom",
					position: moveList.indexOf(elem),
					is_expanded: elem.querySelector(".collapse-button").textContent == "Collapse"
				});
			}
		}else {
			o[elem.name] = normalizeStr(elem.value);
		}
	});
	o['notes'] = simplemde.value();
	o['id'] = Number(document.getElementById('character-sheet').dataset.charid);
	if (o.name==0) {
		delete o.name;
	}

	// stringify lists
	o.basic_properties = JSON.stringify(o.basic_properties);
	o.playbooks = JSON.stringify(o.playbooks);

	return o;
}

// autosave
function makeAutosave() {
	setCookie('charAutosave',getCharData());
	setCookie('charAutosavePending',true);
}


// send autosaves
window.onload = function () {
    if (JSON.parse(getCookie('charAutosavePending'))) {
        sendSave(JSON.parse(getCookie('charAutosave')))
            .then((result) => {
				console.log(result);
                if (new Date(result) != "Invalid Date") {
                    setCookie('charAutosavePending',false);
                }
            });
    }
}


// get playbook data
var allEquipmentData, playbookMoveData, allPlaybooks;
async function getData() {
	// equipment
	var equipmentResponse = await fetch('/database/AllEquipment', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({csrf:document.getElementById("csrfToken").value})
	});
	allEquipmentData = await equipmentResponse.json();

	// moves
	var moveResponse = await fetch('/database/AllMoves', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({csrf:document.getElementById("csrfToken").value})
	});
	playbookMoveData = await moveResponse.json();
}
getData();


// STATIC LISTENERS
document.getElementById("saveButton").addEventListener('click', function() {
	refreshListeners();
	sendSave(getCharData())
		.then((result) => {
			if (result.includes("/character")) {
				setCookie("charAutosavePending",false);
				window.location.href = result;
			}else if (new Date(result)=="Invalid Date") {
				document.getElementById("save-warning").textContent = result;
			}else {
				document.querySelector("#last-saved em").textContent = result;
				setCookie('charAutosavePending',false);
			}
		});
});

// share logic
var sendShareButton = document.getElementById("share-modal-button");
if (sendShareButton) {
	sendShareButton.addEventListener("click", sendShare.bind(null,'soa'));

	[...document.getElementsByClassName("delete-user-button")].forEach(elem => {
		elem.addEventListener("click", (event) => {
			event.target.closest(".shared-entry").remove();
		})
	});
}

var deleteCharacterButton = document.getElementById("deleteCharacterButton");
if (deleteCharacterButton) {
	deleteCharacterButton.addEventListener("click", function() {
		var confirmation = confirm("Deleting your character is not permanent, but only Gracie can recover it.\n\nAre you SURE you want to DELETE THIS CHARACTER?");
		if (confirmation) {
			refreshListeners();
			var char = getCharData();
			char.users = "[]";
			sendSave(char)
				.then((result) => {
					setCookie("charAutosavePending",false);
					window.location.href = "/load_characters/soa";
				});
		}
	});
}

document.getElementById("character-img-input").addEventListener("input",updateImg);

document.getElementById("add-basic-property-button").addEventListener("click", function () {
	var currentCount = [...document.getElementsByClassName("character-property")].length;
	if (currentCount < 16) {
		let newHTML = Handlebars.templates.basicPropertyEntry({});
		var section = document.getElementById('basic-properties-list');
		section.insertAdjacentHTML('beforeend', newHTML);
		makeAutosave();
	}
});

document.getElementById("character-img-edit-button").addEventListener("click", function() {
	document.getElementById("character-img-input").classList.toggle("hidden");
});

[...document.getElementsByClassName("dropdown-list")].forEach((elem) => {
	elem.addEventListener("mousedown", (event) => {
		event.preventDefault();
	});
});

document.getElementById("collapse-all-equipment").addEventListener("click", (event) => {
	refreshListeners();
	var state = event.target.textContent == "Collapse All";
	equipmentEntries.forEach(content => {
		if (state) {
			content.style.minHeight = null;
			content.style.maxHeight = null;
			event.target.textContent = "Expand All";
			equipCollapseButtons.forEach((elem) => {elem.textContent = "Expand"});
		} else {
			content.style.minHeight = "100px";
			content.style.maxHeight = content.scrollHeight + "px";
			event.target.textContent = "Collapse All";
			equipCollapseButtons.forEach((elem) => {elem.textContent = "Collapse"});
		}
	})
});

document.getElementById("collapse-all-moves").addEventListener("click", (event) => {
	refreshListeners();
	var state = event.target.textContent == "Collapse All";
	moveEntries.forEach(content => {
		if (state) {
			content.style.minHeight = null;
			content.style.maxHeight = null;
			event.target.textContent = "Expand All";
			moveCollapseButtons.forEach((elem) => {elem.textContent = "Expand"});
		} else {
			content.style.minHeight = "100px";
			content.style.maxHeight = content.scrollHeight + "px";
			event.target.textContent = "Collapse All";
			moveCollapseButtons.forEach((elem) => {elem.textContent = "Collapse"});
		}
	})
});

//playbook search
var playbookListDropdown = document.getElementById("playbook-dropdown");

function updatePlaybookFilter() {
	var playbooks = ["Any"];
	[...document.querySelectorAll("#move-playbook-selector option")].forEach((elem) => {elem.remove()});

	[...document.getElementsByClassName("playbook-entry")].forEach((elem) => {playbooks.push(elem.dataset.playbookname)});

	playbooks.forEach((playbook) => {
		let newHTML = Handlebars.templates.soaPlaybookFilterEntry(playbook);
		var section = document.getElementById('move-playbook-selector');
		section.insertAdjacentHTML('beforeend', newHTML);
	})
}

document.getElementById("playbook-search").addEventListener("focusin", function () {
	playbookListDropdown.classList.remove("hidden");
	playbookFilter();
});

document.getElementById("playbook-search").addEventListener("focusout", function () {
	playbookListDropdown.classList.add("hidden");
});

[...document.getElementsByClassName("playbook-list-entry")].forEach(elem => {
	elem.addEventListener("click", function() {
		let newHTML = Handlebars.templates.soaPlaybookEntry(elem.textContent);
		var section = document.getElementById('playbook-list');
		section.insertAdjacentHTML('beforeend', newHTML);
		playbookFilter();
		makeAutosave();
	})
});

// equipment search
var equipmentListDropdown = document.getElementById("equipment-dropdown");

document.getElementById("equipment-search").addEventListener("focusin", function () {
	equipmentListDropdown.classList.remove("hidden");
	equipmentFilter();
});

document.getElementById("equipment-search").addEventListener("focusout", function () {
	equipmentListDropdown.classList.add("hidden");
});

[...document.getElementsByClassName("equipment-list-entry")].forEach(elem => {
	elem.addEventListener("click", function() {
		let newHTML = Handlebars.templates.soaEquipmentEntry(allEquipmentData[elem.dataset.equipmentid]);
		var section = document.getElementById('equipment-list');
		section.insertAdjacentHTML('beforeend', newHTML);
		equipmentFilter();
		makeAutosave();
	})
});

document.getElementById("add-equipment-button").addEventListener("click", function () {
	let newHTML = Handlebars.templates.soaCustomEquipmentEntry({});
	var section = document.getElementById('equipment-list');
	section.insertAdjacentHTML('beforeend', newHTML);
	makeAutosave();
});

// move search
var moveListDropdown = document.getElementById("move-dropdown");

document.getElementById("move-search").addEventListener("focusin", function () {
	moveListDropdown.classList.remove("hidden");
	moveFilter();
});

document.getElementById("move-search").addEventListener("focusout", function () {
	moveListDropdown.classList.add("hidden");
});

[...document.getElementsByClassName("move-list-entry")].forEach(elem => {
	elem.addEventListener("click", function() {
		let newHTML = Handlebars.templates.soaMoveEntry(playbookMoveData[elem.dataset.moveid]);
		var section = document.getElementById('move-list');
		section.insertAdjacentHTML('beforeend', newHTML);
		moveFilter();
		makeAutosave();
	})
});

document.getElementById("add-move-button").addEventListener("click", function () {
	let newHTML = Handlebars.templates.soaCustomMoveEntry({});
	var section = document.getElementById('move-list');
	section.insertAdjacentHTML('beforeend', newHTML);
	makeAutosave();
});


// dropdown logic
function onpageFilter(item) {
	var moveData = playbookMoveData[item.dataset.moveid];
	var moveList = [...document.getElementsByClassName("move-entry")].map(elem => {return Number(elem.dataset.moveid)});
	var invalid = false;
	
	// type selector
	var selectedType = document.getElementById("move-type-selector").value;
	if ((selectedType != "Any") && (moveData.type != selectedType)) {
		invalid = true;
	}

	var selectedPlaybook = document.getElementById("move-playbook-selector").value;
	if ((selectedPlaybook != "Any") && (moveData.source != selectedPlaybook)) {
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
	var playbookList = [...document.querySelectorAll(".playbook-entry label")];
	var charLevel = Number(document.getElementById("level-value").value);
	var invalid = false;

	// check if valid playbook
	if ((playbookList.length > 0) && !(playbookList.map(elem => {return elem.textContent}).includes(moveData.source)) && (moveData.source != "Custom")) {
		invalid = true;
	}

	// check if valid prereqs
	if (moveData.prereq_level > charLevel) {
		invalid = true;
	}
	
	if (!(moveList.map(elem => Number(elem.dataset.moveid)).includes(moveData.prereq_move)) && (moveData.prereq_move != 0)) {
		invalid = true;
	}

	// check if second background available
	var backgroundList = moveList.filter(move => move.dataset.type == "Background");
	if ((backgroundList.length > 0) && (moveData.type == "Background") && (charLevel < 6)) {
		invalid = true;
	}

	return invalid && classlessMode;
}

function textFilter(item,filter) {
	var invalid = true;
	
	// check if name contains current search input
	if (item.textContent.toUpperCase().indexOf(filter.toUpperCase()) > -1) {
		invalid = false;
	}

	return invalid;
}

function playbookFilter() {
	var dropdownList = [...document.getElementsByClassName("playbook-list-entry")];
	var playbookList = [...document.getElementsByClassName("playbook-entry")].map(elem => {return elem.dataset.playbookname});
	var filterText = document.getElementById("playbook-search").value;

	for (var i = 0; i < dropdownList.length; i++) {
		if (textFilter(dropdownList[i],filterText) || (playbookList.includes(dropdownList[i].textContent))) {
			dropdownList[i].style.display = "none";
		} else {
			dropdownList[i].style.display = "";
		}
	}
}

function equipmentFilter() {
	var dropdownList = [...document.getElementsByClassName("equipment-list-entry")];
	var equipmentList = [...document.getElementsByClassName("item-entry")].map(elem => {return elem.dataset.equipid});
	var filterText = document.getElementById("equipment-search").value;

	for (var i = 0; i < dropdownList.length; i++) {
		if (textFilter(dropdownList[i],filterText) || (equipmentList.includes(dropdownList[i].dataset.equipmentid))) {
			dropdownList[i].style.display = "none";
		} else {
			dropdownList[i].style.display = "";
		}
	}
}

function moveFilter() {
	var dropdownList = [...document.getElementsByClassName("move-list-entry")];
	var filterText = document.getElementById("move-search").value;

	for (var i = 0; i < dropdownList.length; i++) {
		if (onpageFilter(dropdownList[i]) || rulesFilter(dropdownList[i]) || textFilter(dropdownList[i],filterText)) {
			dropdownList[i].style.display = "none";
		} else {
			dropdownList[i].style.display = "flex";
		}
	}
}
