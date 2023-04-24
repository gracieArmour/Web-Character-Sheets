console.log("soa js loaded");


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
	var equipmentResponse = await fetch('/database/AllEquipment', {method: 'POST'});
	allEquipmentData = await equipmentResponse.json();

	// moves
	var moveResponse = await fetch('/database/AllMoves', {method: 'POST'});
	playbookMoveData = await moveResponse.json();
}
getData();


// notes section
var simplemde = new SimpleMDE({ element: document.getElementById("character-notes") });


// STATIC LISTENERS
document.getElementById("add-basic-property-button").addEventListener("click", function () {
	let newHTML = Handlebars.templates.basicPropertyEntry({});
	var section = document.getElementById('basic-properties-list');
	section.insertAdjacentHTML('beforeend', newHTML);
	refreshListeners();
});

document.getElementById("character-img-edit-button").addEventListener("click", function() {
	document.getElementById("character-img-input").classList.toggle("hidden");
});

//playbook search
var playbookListDropdown = document.getElementById("playbook-dropdown");

document.getElementById("playbook-search").addEventListener("focusin", function () {
	playbookListDropdown.classList.remove("hidden");
	playbookFilter();
});

document.getElementById("playbook-search").addEventListener("focusout", function () {
	setTimeout(function() {
		playbookListDropdown.classList.add("hidden");
	},100);
});

[...document.getElementsByClassName("playbook-list-entry")].forEach(elem => {
	elem.addEventListener("click", function() {
		let newHTML = Handlebars.templates.soaPlaybookEntry(elem.textContent);
		var section = document.getElementById('playbook-list');
		section.insertAdjacentHTML('beforeend', newHTML);
		refreshListeners();
	})
});

// equipment search
var equipmentListDropdown = document.getElementById("equipment-dropdown");

document.getElementById("equipment-search").addEventListener("focusin", function () {
	equipmentListDropdown.classList.remove("hidden");
	equipmentFilter();
});

document.getElementById("equipment-search").addEventListener("focusout", function () {
	setTimeout(function() {
		equipmentListDropdown.classList.add("hidden");
	}, 100);
});

[...document.getElementsByClassName("equipment-list-entry")].forEach(elem => {
	elem.addEventListener("click", function() {
		let newHTML = Handlebars.templates.soaEquipmentEntry(allEquipmentData[elem.dataset.equipmentid]);
		var section = document.getElementById('equipment-list');
		section.insertAdjacentHTML('beforeend', newHTML);
		refreshListeners();
	})
});

document.getElementById("add-equipment-button").addEventListener("click", function () {
	let newHTML = Handlebars.templates.soaCustomEquipmentEntry({});
	var section = document.getElementById('equipment-list');
	section.insertAdjacentHTML('beforeend', newHTML);
	refreshListeners();
});

// move search
var moveListDropdown = document.getElementById("move-dropdown");

document.getElementById("move-search").addEventListener("focusin", function () {
	moveListDropdown.classList.remove("hidden");
	moveFilter();
});

document.getElementById("move-search").addEventListener("focusout", function () {
	setTimeout(function() {
		moveListDropdown.classList.add("hidden");
	}, 100);
});

[...document.getElementsByClassName("move-list-entry")].forEach(elem => {
	elem.addEventListener("click", function() {
		let newHTML = Handlebars.templates.soaMoveEntry(playbookMoveData[elem.dataset.moveid]);
		var section = document.getElementById('move-list');
		section.insertAdjacentHTML('beforeend', newHTML);
		refreshListeners();
	})
});

document.getElementById("add-move-button").addEventListener("click", function () {
	let newHTML = Handlebars.templates.soaCustomMoveEntry({});
	var section = document.getElementById('move-list');
	section.insertAdjacentHTML('beforeend', newHTML);
	refreshListeners();
});


// DYNAMIC LISTENERS
var savables;
function refreshListeners() {
	[...document.getElementsByClassName("delete-playbook-button")].forEach(elem => {
		elem.addEventListener("click", (event) => {
			event.target.closest(".playbook-entry").remove();
		})
	});

	[...document.getElementsByClassName("delete-equipment-button")].forEach(elem => {
		elem.addEventListener("click", (event) => {
			event.target.closest(".item-entry").remove();
		})
	});

	[...document.getElementsByClassName("delete-move-button")].forEach(elem => {
		elem.addEventListener("click", (event) => {
			event.target.closest(".move-entry").remove();
		})
	});

	savables = [...document.getElementsByClassName("savable")];
	savables.forEach(elem => {
		elem.addEventListener("change", function() {
			setCookie('charAutosave',getCharData());
			setCookie('charAutosavePending',true);
		})
	});
}
refreshListeners();


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
	var charLevel = document.getElementById("level-value").value;
	var invalid = false;

	// check if valid playbook
	if ((playbookList.length > 0) && !(playbookList.map(elem => {return elem.textContent}).includes(moveData.source)) && (moveData.source != "Custom")) {
		invalid = true;
	}

	// check if valid prereqs
	if (moveData.prereq_level > charLevel) {
		invalid = true;
	}
	
	if (!(moveList.map(elem => {return elem.dataset.moveid}).includes(moveData.prereq_move)) && (moveData.prereq_move != 0)) {
		invalid = true;
	}

	// check if second background available
	var backgroundList = moveList.filter(move => {move.dataset.type == "Background"}).map(elem => {return elem.dataset.moveid});
	if ((backgroundList != []) && (moveData.type == "Background") && (charLevel < 6)) {
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


// share logic
[...document.getElementsByClassName("delete-user-button")].forEach(elem => {
	elem.addEventListener("click", (event) => {
		event.target.closest(".shared-entry").remove();
	})
});


document.getElementById("share-modal-button").addEventListener("click", sendShare.bind(null,'soa'));


// save logic
function getCharData() {
	var o = {
		basic_properties: [],
		playbooks: [],
		equipment: [],
		customEquips: [],
		moves: [],
		customMoves: []
	};

	savables.forEach(elem => {
		if (elem.classList.contains("save-img")) {
			o[elem.name] = elem.src;
		}else if (elem.classList.contains("save-bProps")) {
			o['basic_properties'].push({name:elem.name,value:elem.value});
		}else if (elem.classList.contains("save-customProps")) {
			if (elem.childNodes.item("name").value) {
				o['basic_properties'].push({
					name: elem.childNodes.item("name").value,
					value: elem.childNodes.item("value").value
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
				uses: Number(elem.querySelector('.item-uses input').value)
			});
		}else if (elem.classList.contains("save-customEquips")) {
			if (elem.querySelector('.item-name-container label input').value) {
				o['customEquips'].push({
					name: elem.querySelector('.item-name-container label input').value,
					description: elem.querySelector('.entry-description').value,
					base_uses: Number(elem.querySelector('.item-uses input').value),
					cost: Number(elem.querySelector('.item-cost-container input').value),
					type: elem.querySelector('.item-name-container select').value,
					is_custom: 1
				});
			}
		}else if (elem.classList.contains("save-moves")) {
			o['moves'].push(Number(elem.dataset.moveid));
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
					name: elem.querySelector('.move-name-container label input').value,
					description: elem.querySelector('.entry-description').value,
					type: moveType,
					prereq_level: levelReq,
					prereq_move: 0,
					source: "Custom"
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

document.getElementById("saveButton").addEventListener('click', function() {
	sendSave(getCharData())
		.then((result) => {
			if (result.includes("/character")) {
				window.location.href = result;
			}else if (new Date(result)=="Invalid Date") {
				document.getElementById("save-warning").textContent = result;
			}else {
				document.querySelector("#last-saved em").textContent = result;
				setCookie('charAutosavePending',false);
			}
		});
});
