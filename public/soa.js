document.getElementById("add-equipment-button").addEventListener("click", function () {
	let newHTML = Handlebars.templates.soaEquipmentEntry({});
	var section = document.getElementById('equipment-list');
	section.insertAdjacentHTML('beforeend', newHTML);
});

document.getElementById("add-move-button").addEventListener("click", function () {
	let newHTML = Handlebars.templates.soaMoveEntry({});
	var section = document.getElementById('move-list');
	section.insertAdjacentHTML('beforeend', newHTML);
});

document.getElementById("add-spell-button").addEventListener("click", function () {
	let newHTML = Handlebars.templates.soaSpellEntry({});
	var section = document.getElementById('spell-list');
	section.insertAdjacentHTML('beforeend', newHTML);
});

var simplemde = new SimpleMDE({ element: document.getElementById("character-notes") });