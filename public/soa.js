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
//     fetch('/database', {
//         method: 'POST'
//     })
// });