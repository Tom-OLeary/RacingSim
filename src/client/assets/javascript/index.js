/* 
Tom O'Leary
Racing Simulator
index.js
*/

// all information needed globally
var store = {
	track_id: undefined,
	player_id: undefined,
	race_id: undefined,
	tracks: undefined
}

const updateStore = (store, newState) => {
	store = Object.assign(store, newState);
}

// wait until the DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
	onPageLoad()
	setupClickHandlers()
})

// render tracks and racers on page load
async function onPageLoad() {
	try {
		getTracks()
			.then(tracks => {
				store.tracks = tracks
				const html = renderTrackCards(tracks)
				renderAt('#tracks', html)
			})

		getRacers()
			.then((racers) => {
				const html = renderRacerCars(racers)
				renderAt('#racers', html)
			})
	} catch(error) {
		console.log("Problem getting tracks and racers ::", error.message)
		console.error(error)
	}
}

function setupClickHandlers() {
	document.addEventListener('click', function(event) {
		const { target } = event

		// Race track form field
		if (target.matches('.card.track')) {
			handleSelectTrack(target)
		}

		// Podracer form field
		if (target.matches('.card.podracer')) {
			handleSelectPodRacer(target)
		}

		// Submit create race form
		if (target.matches('#submit-create-race')) {
			event.preventDefault()
	
			// start race
			handleCreateRace()
		}

		// Handle acceleration click
		if (target.matches('#gas-peddle')) {
			handleAccelerate(target)
		} 

	}, false)
}

async function delay(ms) {
	try {
		return await new Promise(resolve => setTimeout(resolve, ms));
	} catch(error) {
		console.log("an error shouldn't be possible here")
		console.log(error)
	}
}

// controls the flow of the race
async function handleCreateRace() {
	const { player_id, track_id, tracks } = store

	// render starting UI
	renderAt('#race', renderRaceStartView(tracks.find(track => parseInt(track.id) === parseInt(track_id))))
	
	try {
		const race = await createRace(player_id, track_id)

		store.race_id = race.ID

		await runCountdown()
		await startRace(race.ID - 1)
		await runRace(race.ID - 1)
	} catch (err) {
		console.log("Error in handleCreateRace()", err.message)
	}
}

// get race info every 500ms or render results
function runRace(raceID) {
	return new Promise(resolve => {
		const raceInfo = setInterval(() => {
			getRace(raceID)
				.then(res => {
					if (res.status === 'in-progress') {
						renderAt('#leaderBoard', raceProgress(res.positions))
					} else {
						clearInterval(raceInfo)
						renderAt('#race', resultsView(res.positions))
						resolve(res)
					}
				})
		}, 500)
	})
	.catch(err => console.log("Error with runRace()", err))
}

async function runCountdown() {
	try {
		// wait for the DOM to load
		await delay(1000)
		let timer = 3

		return new Promise(resolve => {
			const countdown = setInterval(() => {
				document.getElementById('big-numbers').innerHTML = --timer
				if (timer === 0) {
					clearInterval(countdown)
					resolve()
					return
				}
			}, 1000)
		})
	} catch(error) {
		console.log(error);
	}
}

function handleSelectPodRacer(target) {
	console.log("Vehicle selected", target.id)

	// remove class selected from all racer options
	const selected = document.querySelector('#racers .selected')
	if(selected) {
		selected.classList.remove('selected')
	}

	// add class selected to current target
	target.classList.add('selected')

	store.player_id = target.id
}

function handleSelectTrack(target) {
	console.log("Track selected", target.id)

	// remove class selected from all track options
	const selected = document.querySelector('#tracks .selected')
	if(selected) {
		selected.classList.remove('selected')
	}

	// add class selected to current target
	target.classList.add('selected')

	store.track_id = target.id
}

function handleAccelerate() {
		accelerate(store.race_id - 1);
}

// HTML VIEWS ------------------------------------------------

function renderRacerCars(racers) {
	if (!racers.length) {
		return `
			<h4>Loading Racers...</4>
		`
	}

	const results = racers.map(renderRacerCard).join('')

	return `
		<ul id="racers">
			${results}
		</ul>
	`
}

function renderRacerCard(racer) {
	const { id, driver_name, top_speed, acceleration, handling } = racer

	return `
		<li class="card podracer" id="${id}">
			<h3>${driver_name}</h3>
			<p>${top_speed}</p>
			<p>${acceleration}</p>
			<p>${handling}</p>
		</li>
	`
}

function renderTrackCards(tracks) {
	if (!tracks.length) {
		return `
			<h4>Loading Tracks...</4>
		`
	}

	const results = tracks.map(renderTrackCard).join('')

	return `
		<ul id="tracks">
			${results}
		</ul>
	`
}

function renderTrackCard(track) {
	const { id, name } = track

	return `
		<li id="${id}" class="card track">
			<h3>${name}</h3>
		</li>
	`
}

function renderCountdown(count) {
	return `
		<h2>Race Starts In...</h2>
		<p id="big-numbers">${count}</p>
	`
}

function renderRaceStartView(track, racers) {
	return `
		<header>
			<h1>Race: ${track.name}</h1>
		</header>
		<main id="two-columns">
			<section id="leaderBoard">
				${renderCountdown(3)}
			</section>
			<section id="accelerate">
				<h2>Directions</h2>
				<p>Click the button as fast as you can to make your racer go faster!</p>
				<button id="gas-peddle">Click Me To Win!</button>
			</section>
		</main>
		<footer></footer>
	`
}

function resultsView(positions) {
	positions.sort((a, b) => (a.final_position > b.final_position) ? 1 : -1)

	return `
		<header>
			<h1>Race Results</h1>
		</header>
		<main>
			${raceProgress(positions)}
			<a href="/race">Start a new race</a>
		</main>
	`
}

function raceProgress(positions) {
	let userPlayer = positions.find((e) => parseInt(e.id) === parseInt(store.player_id))
	userPlayer.driver_name += " (you)"

	positions = positions.sort((a, b) => (a.segment > b.segment) ? -1 : 1)
	let count = 1

	const results = positions.map(p => {
		return `
			<tr>
				<td>
					<h3>${count++} - ${p.driver_name}</h3>
				</td>
			</tr>
		`
	}).join("")

	return `
		<main>
			<h3>Leaderboard</h3>
			<section id="leaderBoard">
				${results}
			</section>
		</main>
	`
}

function renderAt(element, html) {
	const node = document.querySelector(element)

	node.innerHTML = html
}

// API CALLS ------------------------------------------------

const SERVER = 'http://localhost:8000'

function defaultFetchOpts() {
	return {
		mode: 'cors',
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin' : SERVER,
		},
	}
}

// [GET] ${SERVER}/api/tracks
function getTracks() {
	return fetch(`${SERVER}/api/tracks`, {
		...defaultFetchOpts()
	})
		.then(res => res.json())
		.catch(err => console.log("Error with getTracks request::", err))
}

// [GET] ${SERVER}/api/cars
function getRacers() {
	return fetch(`${SERVER}/api/cars`, {
		...defaultFetchOpts()
	})
		.then(res => res.json())
		.catch(err => console.log("Error with getRacers request::", err))
}

// [POST] ${SERVER}/api/races 
function createRace(player_id, track_id) {
	player_id = parseInt(player_id)
	track_id = parseInt(track_id)
	const body = { player_id, track_id }
	
	return fetch(`${SERVER}/api/races`, {
		method: 'POST',
		...defaultFetchOpts(),
		dataType: 'jsonp',
		body: JSON.stringify(body)
	})
	.then(res => res.json())
	.catch(err => console.log("Error with createRace request::", err))
}

// [GET] ${SERVER}/api/races/${id}
function getRace(id) {
	return fetch(`${SERVER}/api/races/${id}`, {
		...defaultFetchOpts(),
	})
	.then(res => res.json())
	.catch(err => console.log("Error with getRace request::", err))
}

// [POST] ${SERVER}/api/races/${id}/start
function startRace(id) {
	return fetch(`${SERVER}/api/races/${id}/start`, {
		method: 'POST',
		...defaultFetchOpts(),
	})
	.catch(err => console.log("Error with startRace request::", err))
}

// [POST] ${SERVER}/api/races/${id}/accelerate
function accelerate(id) {
	return fetch(`${SERVER}/api/races/${id}/accelerate`, {
		method: 'POST',
		...defaultFetchOpts(),
	})
	.catch(err => console.log("Error with accelerate request::", err))
}
