console.log("client-side js loaded");

var formElem = document.getElementById("character-sheet");
var submitButton = document.getElementById("saveButton");

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

var header = document.getElementById("site-header");

header.addEventListener('click', e => {
    fetch('/database', {
        method: 'POST'
    })
});
