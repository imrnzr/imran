const { ipcRenderer } = require('electron');

let itinerary = [];
let editingItemIndex = null;

// Function to fetch attractions for a country
async function fetchCountryAttractions(countryName) {
    try {
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${countryName}`);
        if (response.ok) {
            const data = await response.json();
            displayAttractions(data);
        } else {
            console.log("No attractions found for this country.");
        }
    } catch (error) {
        console.error("Error fetching attractions:", error);
    }
}

function displayAttractions(attractionData) {
    const countryInfo = document.getElementById('countryInfo');

    // Adding notable attraction information with a picture
    if (attractionData.thumbnail && attractionData.thumbnail.source) {
        countryInfo.innerHTML += `
            <div class="attraction">
                <h3>Notable Attraction: ${attractionData.title}</h3>
                <img src="${attractionData.thumbnail.source}" alt="${attractionData.title}" width="150">
                <p>${attractionData.extract}</p>
                <a href="${attractionData.content_urls.desktop.page}" target="_blank">Read more on Wikipedia</a>
            </div>
        `;
    } else {
        countryInfo.innerHTML += `<p>No notable attractions found for this country.</p>`;
    }
}

// Modify searchCountry to include attractions
async function searchCountry() {
    const country = document.getElementById('countryInput').value.trim();
    if (country) {
        try {
            const response = await fetch(`https://restcountries.com/v3.1/name/${country}`);
            if (!response.ok) throw new Error("Country not found");
            const data = await response.json();
            displayCountryInfo(data[0]);
            getNearbyCountries(data[0].borders);
            fetchCountryAttractions(data[0].name.common); // Fetch and display attractions
        } catch (error) {
            displayModal("Could not find the country. Please check your input.");
            console.error("Fetch error:", error);
        }
    } else {
        displayModal("Please enter a country name.");
    }
}


function displayCountryInfo(country) {
    const countryInfo = document.getElementById('countryInfo');
    const languages = country.languages ? Object.values(country.languages).join(", ") : "N/A";
    const timeZones = country.timezones ? country.timezones.join(", ") : "N/A";
    const mapsLink = country.maps ? `<a href="${country.maps.googleMaps}" target="_blank">Google Maps</a>` : "N/A";
    const coatOfArms = country.coatOfArms && country.coatOfArms.svg ? `<img src="${country.coatOfArms.svg}" alt="Coat of Arms" width="100">` : "N/A";

    countryInfo.innerHTML = `
        <h2>${country.name.common}</h2>
        <p><strong>Capital:</strong> ${country.capital ? country.capital[0] : "N/A"}</p>
        <p><strong>Continent:</strong> ${country.continents ? country.continents[0] : "N/A"}</p>
        <p><strong>Region:</strong> ${country.region}</p>
        <p><strong>Subregion:</strong> ${country.subregion || "N/A"}</p>
        <p><strong>Population:</strong> ${country.population.toLocaleString()}</p>
        <p><strong>Area:</strong> ${country.area.toLocaleString()} km²</p>
        <p><strong>Languages:</strong> ${languages}</p>
        <p><strong>Time Zone:</strong> ${timeZones}</p>
        <p><strong>Map:</strong> ${mapsLink}</p>
        <p><strong>Location:</strong> Latitude ${country.latlng[0]}, Longitude ${country.latlng[1]}</p>
        <div><strong>Flag:</strong> <img src="${country.flags.svg}" alt="Flag of ${country.name.common}" width="100"></div>
        <div><strong>Coat of Arms:</strong> ${coatOfArms}</div>
    `;
}

// Function to fetch and display nearby countries
async function getNearbyCountries(borders) {
    const nearbyCountriesSection = document.getElementById('nearbyCountries');
    const nearbyCountriesList = document.getElementById('nearbyCountriesList');

    if (borders && borders.length > 0) {
        nearbyCountriesList.innerHTML = '';

        for (const border of borders) {
            try {
                const response = await fetch(`https://restcountries.com/v3.1/alpha/${border}`);
                const [data] = await response.json();
                const countryName = data.name.common;
                const countryImage = data.flags.svg; // Use flag as country image
                const attraction = "Notable Attraction"; // Placeholder for the attraction

                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    <div>
                        <img src="${countryImage}" alt="${countryName} Flag" width="50" />
                        <strong>${countryName}</strong> - ${attraction}
                        <button onclick="addFavorite('${countryName}')">Add to Favorites</button>
                    </div>
                `;
                nearbyCountriesList.appendChild(listItem);
            } catch (error) {
                console.error("Error fetching border country:", error);
            }
        }

        nearbyCountriesSection.classList.remove('hidden');
    } else {
        nearbyCountriesList.innerHTML = '<li>No nearby countries found.</li>';
        nearbyCountriesSection.classList.remove('hidden');
    }
}

async function addFavorite() {
    const countryName = document.getElementById('countryInput').value.trim();
    if (countryName) {
        await ipcRenderer.invoke('add-favorite', countryName);
        displayModal(`Added ${countryName} to favorites!`);
    } else {
        displayModal("Please enter a country name.");
    }
}

function displayModal(message) {
    const modal = document.getElementById('modal');
    document.getElementById('modal-text').textContent = message;
    modal.style.display = "block";
}

function closeModal() {
    document.getElementById('modal').style.display = "none";
}

function showFavorites() {
    ipcRenderer.invoke('get-favorites').then(favorites => {
        const favoritesList = favorites.map(fav => `<li>${fav}</li>`).join('');
        displayModal(`<h2>Your Favorite Countries</h2><ul>${favoritesList}</ul>`);
    });
}

const fs = require('fs');
const path = require('path');

// Define the file path for the itinerary file
const itineraryFilePath = path.join(__dirname, 'itinerary.txt');

// Function to save the entire itinerary to a file
function saveItineraryToFile() {
    // Clear the current file content and write the new itinerary
    const itineraryContent = itinerary.map(item => 
        `Destination: ${item.destination}, Note: ${item.note}, Date: ${item.date}, Time: ${item.time}`
    ).join('\n') + '\n';

    fs.writeFile(itineraryFilePath, itineraryContent, (err) => {
        if (err) {
            console.error('Error saving itinerary:', err);
            displayModal("Error saving itinerary. Please try again.");
        } else {
            console.log('Itinerary updated in file.');
        }
    });
}

// Modify the event listener for form submission to include saving to file
document.getElementById('itineraryForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const destination = document.getElementById('destinationInput').value.trim();
    const note = document.getElementById('noteInput').value.trim();
    const date = document.getElementById('dateInput').value;
    const time = document.getElementById('timeInput').value;

    if (destination && note && date && time) {
        addItineraryItem(destination, note, date, time);
        // Save itinerary to file after adding to the list
        saveItineraryToFile();
        // Clear form fields after saving
        document.getElementById('destinationInput').value = '';
        document.getElementById('noteInput').value = '';
        document.getElementById('dateInput').value = '';
        document.getElementById('timeInput').value = '';
    } else {
        displayModal("Please fill in all fields.");
    }
});

function addItineraryItem(destination, note, date, time) {
    itinerary.push({ destination, note, date, time });
    renderItinerary();
}

function renderItinerary() {
    const itineraryList = document.getElementById('itineraryList');
    itineraryList.innerHTML = itinerary.map((item, index) => `
        <li>
            ${item.destination} - ${item.note} <br>
            <strong>Date:</strong> ${item.date}, <strong>Time:</strong> ${item.time}
            <button onclick="editItineraryItem(${index})">Edit</button>
            <button onclick="removeItineraryItem(${index})">Remove</button>
        </li>
    `).join('');
}

function removeItineraryItem(index) {
    itinerary.splice(index, 1);
    renderItinerary();
    saveItineraryToFile(); // Save changes to file
}

function editItineraryItem(index) {
    editingItemIndex = index;
    const item = itinerary[index];
    // Populate edit fields with existing values
    document.getElementById('editDestinationInput').value = item.destination;
    document.getElementById('editNoteInput').value = item.note;
    document.getElementById('editDateInput').value = item.date;
    document.getElementById('editTimeInput').value = item.time;
    document.getElementById('editModal').style.display = 'block';
}

function updateItineraryItem() {
    const updatedDestination = document.getElementById('editDestinationInput').value.trim();
    const updatedNote = document.getElementById('editNoteInput').value.trim();
    const updatedDate = document.getElementById('editDateInput').value;
    const updatedTime = document.getElementById('editTimeInput').value;

    if (editingItemIndex !== null && updatedDestination && updatedNote && updatedDate && updatedTime) {
        // Update the itinerary item with new values
        itinerary[editingItemIndex] = {
            destination: updatedDestination,
            note: updatedNote,
            date: updatedDate,
            time: updatedTime
        };
        renderItinerary();
        saveItineraryToFile(); // Save changes to file after update
        closeEditModal();
    } else {
        displayModal("Please fill in all fields.");
    }
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    editingItemIndex = null;
}

// Toggle itinerary visibility
function openItinerary() {
    document.getElementById('itinerarySection').classList.toggle('hidden');
}