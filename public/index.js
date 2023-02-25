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
