import { AsyncStorage, Platform } from 'react-native';
import API from './key'; // You must create your own key.js file IMPORTANT
import { KEY } from './constants';

const REFRESH_TIME = 60000; // time required before second refresh (ms)

const utils = {
  isAndroid: () => Platform.OS === 'android',

  getCurrentPosition: () => {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(position => resolve(position));
    });
  },

  getCurrentWeather: async ({latitude,longitude}) => {
    // const URL_BASE = 'http://api.openweathermap.org/data/2.5/weather?';
    const URL_BASE = 'http://api.openweathermap.org/data/2.5/forecast?';
    //const url = 'http://samples.openweathermap.org/data/2.5/weather?lat=35&lon=139&appid=b1b15e88fa797225412429c1c50c122a1';
    const url = `${URL_BASE}lat=${latitude}&lon=${longitude}&appid=${API}&units=metric`;
    return new Promise((resolve) => {
      fetch(url).then(response => {
        const bodyText = response._bodyText;
        if (bodyText && typeof response._bodyText === 'string') {
          resolve(JSON.parse(response._bodyText));
        } else {
          resolve(response.data);
        }
      }).catch((error) => {
        throw new Error(error)
      });
    });
    //return(null);
  },

  retrieveDayForecast: async (data,count) => {
    const d = new Date();
    const z = n => n.toString().length === 1 ? `0${n}` : n ;// Zero pad
    const date = `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`; // returns (2017-11-10 ie YYYY-MM-DD)

    let description = "";
    for (let i=0; i< count; i++){
      if (data.list[i].dt_txt.indexOf(date) === -1) break; //find if the items in the list are todays forcast only
      description = `${description} ${data.list[i].weather[0].description}`; //append descriptions into one variable
    }
    let isRaining = false;
    if( description.indexOf("rain") >= 0 ) isRaining = true;
    return { description, isRaining };
  },

  getCurrentTime: () => new Date(),

  getLocalData: key => AsyncStorage.getItem(key),

  setLocalData: (key, data) => AsyncStorage.setItem(key, JSON.stringify(data)),

  deleteLocalData: (key) => AsyncStorage.multiRemove([key]),

  refreshCachedItems: async () => {
    let { position, weather, lastUpdated, isRaining, description } = await utils.getCachedItems(); //get local data

    if (utils.getCurrentTime() - new Date(lastUpdated) > REFRESH_TIME) { //refresh time limit
      // check each item, then refetch if needed
      position = await utils.getCurrentPosition();
      weather = await utils.getCurrentWeather(position.coords);
      console.log(weather);
      let { description, isRaining } = await utils.retrieveDayForecast(weather,weather.cnt);
      console.log(isRaining);
      lastUpdated = await utils.getCurrentTime();

      await utils.setLocalData(KEY.WEATHER, { position, weather, lastUpdated, description, isRaining });
      return { position, weather, lastUpdated, description, isRaining };
    }

    return { position, weather, lastUpdated, description ,isRaining, remark: true };
  },

  getCachedItems: async () => {
    // Get the localdata
    const localStore = await utils.getLocalData(KEY.WEATHER);
    if (localStore === null) {
      const position = await utils.getCurrentPosition(); // TODO catch
      const weatherData = {
        isRaining:false,
        description:'',
        position, // TODO catch
        weather : await utils.getCurrentWeather(position.coords),
        lastUpdated : await utils.getCurrentTime(),
      };
      await utils.setLocalData(KEY.WEATHER, weatherData);
      return weatherData;
    }
    return JSON.parse(localStore);
  },

  fetchSettings: async () => {
    const localSettings = await utils.getLocalData(KEY.SETTINGS);
    if (localSettings === null) {
      const initDate = new Date();
      initDate.setHours('07');
      initDate.setMinutes('00');
      const sevenAmDate = initDate.toDateString();
      const storedState = {
        date: sevenAmDate,
        isNotifyOn: false,
        isMetric: true,
      };
      await utils.setLocalData(KEY.SETTINGS, storedState);
      return storedState;
    }
    return JSON.parse(localSettings);
  },

  setCachedSettings: async (settingData) => {
    // Set the local settings
    await utils.setLocalData(KEY.SETTINGS, settingData );
  }
};

export default utils;
