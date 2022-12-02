console.log("client-side js loaded");

var formElem = document.getElementById("my-form");
var submitButton = document.getElementById("submitButton");

submitButton.addEventListener('click',e => {
    e.preventDefault();
    var o = {};
    new FormData( formElem ).forEach(( value, key ) => o[key] = value );
    fetch('/api/post/character', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(o)
    })
})