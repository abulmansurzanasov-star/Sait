const form = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const unitBtn = document.getElementById('unit-btn');
const statusEl = document.getElementById('status');
const currentEl = document.getElementById('current');
const forecastEl = document.getElementById('forecast');

let unit = localStorage.getItem('unit') || 'C';
let lastData = null;

function getWeatherInfo(code, isDay = 1) {
  if (code === 0)  return { text: 'Ясно', icon: isDay ? '☀️' : '🌙', theme: isDay ? 'clear' : 'night' };
  if (code <= 2)   return { text: 'Переменная облачность', icon: isDay ? '⛅' : '☁️', theme: isDay ? 'clear' : 'night' };
  if (code === 3)  return { text: 'Пасмурно', icon: '☁️', theme: 'cloudy' };
  if (code <= 48)  return { text: 'Туман', icon: '🌫️', theme: 'cloudy' };
  if (code <= 57)  return { text: 'Морось', icon: '🌦️', theme: 'rain' };
  if (code <= 67)  return { text: 'Дождь', icon: '🌧️', theme: 'rain' };
  if (code <= 77)  return { text: 'Снег', icon: '❄️', theme: 'snow' };
  if (code <= 82)  return { text: 'Ливень', icon: '🌧️', theme: 'rain' };
  if (code <= 86)  return { text: 'Снегопад', icon: '🌨️', theme: 'snow' };
  return { text: 'Гроза', icon: '⛈️', theme: 'storm' };
}

function showStatus(message) {
  statusEl.textContent = message;
  statusEl.hidden = false;
}

function hideStatus() {
  statusEl.hidden = true;
}

function formatTemp(celsius) {
  const value = unit === 'C' ? celsius : celsius * 9 / 5 + 32;
  return Math.round(value) + '°';
}

function dayName(dateString, index) {
  if (index === 0) return 'Сегодня';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', { weekday: 'short' });
}

async function findCity(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=ru`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Ошибка поиска города');
  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error('Город не найден. Проверьте название.');
  }
  const place = data.results[0];
  return { name: place.name, country: place.country, lat: place.latitude, lon: place.longitude };
}

async function getWeather(lat, lon) {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${lat}&longitude=${lon}`
    + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min'
    + '&timezone=auto&forecast_days=5';
  const response = await fetch(url);
  if (!response.ok) throw new Error('Не удалось получить погоду');
  return response.json();
}

function render() {
  if (!lastData) return;
  const { place, weather } = lastData;
  const cur = weather.current;
  const info = getWeatherInfo(cur.weather_code, cur.is_day);

  document.getElementById('city-name').textContent = `${place.name}, ${place.country || ''}`;
  document.getElementById('icon').textContent = info.icon;
  document.getElementById('temp').textContent = formatTemp(cur.temperature_2m);
  document.getElementById('description').textContent = info.text;
  document.getElementById('feels').textContent = formatTemp(cur.apparent_temperature);
  document.getElementById('humidity').textContent = cur.relative_humidity_2m + '%';
  document.getElementById('wind').textContent = Math.round(cur.wind_speed_10m) + ' км/ч';

  document.body.dataset.theme = info.theme;

  const daily = weather.daily;
  forecastEl.innerHTML = '';
  daily.time.forEach((date, i) => {
    const dayInfo = getWeatherInfo(daily.weather_code[i]);
    const div = document.createElement('div');
    div.className = 'day';
    div.innerHTML = `
      <div class="name">${dayName(date, i)}</div>
      <div class="d-icon">${dayInfo.icon}</div>
      <div class="max">${formatTemp(daily.temperature_2m_max[i])}</div>
      <div class="min">${formatTemp(daily.temperature_2m_min[i])}</div>
    `;
    forecastEl.appendChild(div);
  });

  currentEl.hidden = false;
  forecastEl.hidden = false;
}

async function loadByPlace(place) {
  showStatus('Загрузка...');
  try {
    const weather = await getWeather(place.lat, place.lon);
    lastData = { place, weather };
    hideStatus();
    render();
    localStorage.setItem('lastPlace', JSON.stringify(place));
  } catch (error) {
    showStatus('⚠️ ' + error.message);
  }
}

async function loadByCityName(name) {
  showStatus('Ищем город...');
  try {
    const place = await findCity(name);
    await loadByPlace(place);
  } catch (error) {
    showStatus('⚠️ ' + error.message);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = cityInput.value.trim();
  if (name) loadByCityName(name);
});

unitBtn.addEventListener('click', () => {
  unit = unit === 'C' ? 'F' : 'C';
  localStorage.setItem('unit', unit);
  unitBtn.textContent = '°' + unit;
  render();
});

unitBtn.textContent = '°' + unit;

const saved = localStorage.getItem('lastPlace');
if (saved) {
  loadByPlace(JSON.parse(saved));
} else {
  loadByCityName('Астана');
}