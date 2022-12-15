console.log("client-side js loaded");

var navToggles = [...document.getElementsByClassName("dropdown-toggle")];
var navDropdowns = [...document.querySelectorAll(".nav-button ul")];

function toggleNavDropdown(thisButton) {
    navDropdowns.forEach(dropdown => {
        if (thisButton.id.replace("-dropdown-button","") === dropdown.id.replace("-dropdown","")) {
            dropdown.classList.toggle("hidden");
        }
    })
}

navToggles.forEach(button => {
    button.addEventListener('click', toggleNavDropdown.bind(this,button));
})

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
