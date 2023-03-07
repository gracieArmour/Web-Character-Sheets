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

// dropdown logic
function textFilter(filter,list) {
	for (var i = 0; i < list.length; i++) {
		if (list[i].textContent.toUpperCase().indexOf(filter) > -1) {
			list[i].style.display = "";
		} else {
			list[i].style.display = "none";
		}
	}
}

function movefilterLogic() {
	var dropdownList = document.getElementById("myDropdown").getElementsByTagName("a");
	// on-page filters
	
	// rules-based filters (toggleable)

	// run text filter
	var filterText = document.getElementById("myInput").value.toUpperCase();
	textFilter(filterText,dropdownList)
}

function showdropdownmove() {
	document.getElementById("myDropdown").classList.toggle("show");
}

function filterFunction() {
	var filter = document.getElementById("myInput").value.toUpperCase();
	var a = document.getElementById("myDropdown").getElementsByTagName("a");
	for (var i = 0; i < a.length; i++) {
		txtValue = a[i].textContent || a[i].innerText;
		if (txtValue.toUpperCase().indexOf(filter) > -1) {
			a[i].style.display = "";
		} else {
			a[i].style.display = "none";
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
//     fetch('/database', {
//         method: 'POST'
//     })
// });