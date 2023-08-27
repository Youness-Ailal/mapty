'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

let type = inputType.value;
inputType.addEventListener('change', e => {
  type = e.target.value;
});
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, long]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
}

class Running extends Workout {
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//////////////////////////////
// Application Architecture

class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();

    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));
  }

  _getPosition() {
    navigator.geolocation?.getCurrentPosition(this._loadMap.bind(this), () =>
      alert("browser couldn't get your location")
    );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    this.#map = L.map('map').setView([latitude, longitude], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this.renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationField() {
    inputCadence.closest('div').classList.toggle('form__row--hidden');
    inputElevation.closest('div').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) => {
      inputs.some(num => num < 0);
    };
    //Get Values
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    let workout;
    const { lat } = this.#mapEvent.latlng;
    const { lng } = this.#mapEvent.latlng;
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (validInputs([distance, duration, cadence])) {
        inputDistance.value = inputDuration.value = inputCadence.value = '';
        return alert('invalid input');
      }

      workout = new Running([lat, lng], distance, duration, cadence);
      inputDistance.value = inputDuration.value = inputCadence.value = '';
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (validInputs([distance, duration, elevation])) {
        inputDistance.value = inputDuration.value = inputElevation.value = '';

        return alert('invalid input');
      }

      workout = new Cycling([lat, lng], distance, duration, elevation);
      inputDistance.value = inputDuration.value = inputElevation.value = '';
    }
    this.#workouts.push(workout);

    this.renderWorkoutMarker(workout);

    this._renderWorkout(workout);

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);

    this._setLocalStorage();
  }

  renderWorkoutMarker(workout) {
    const mark = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          closeOnClick: false,
          autoClose: false,
          className: `${type}-popup`,
        })
      )
      .setPopupContent(
        `${type === 'running' ? '🏃‍♂️ Running on' : ' 🚴‍♂️ Cycling on'} ${
          months[new Date().getMonth() + 1]
        } ${new Date().getDate()}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    containerWorkouts.insertAdjacentHTML(
      'beforeend',
      `<li class="workout workout--${type}" data-id="${workout.id}">
          <h2 class="workout__title">${type} on ${
        months[new Date(workout.date).getMonth() + 1]
      } ${new Date(workout.date).getDate()}</h2>
          <div class="workout__details">
            <span class="workout__icon"> ${
              type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
            } </span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${
              type === 'running'
                ? Math.floor(workout.pace)
                : Math.floor(workout.speed)
            }</span>
            <span class="workout__unit">${
              type === 'running' ? 'min/km' : 'km/h'
            }</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
              type === 'running' ? '🦶🏼' : '🚲'
            }</span>
            <span class="workout__value">${
              type === 'running' ? workout.cadence : workout.elevation
            }</span>
            <span class="workout__unit">${
              type === 'running' ? 'spm' : 'meters'
            }</span>
          </div>
        </li>`
    );
  }
  _moveToMarker(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    const [lat, lon] = workout.coords;

    this.#map.setView([lat, lon], 14, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
