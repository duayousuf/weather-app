(function(){
  "use strict";

  const state = {
    unit: localStorage.getItem('aloft_unit') || 'c',
    lat: null, lon: null, name: null, admin: null, country: null, countryCode: null, tz: null,
    data: null
  };

  const $ = (id) => document.getElementById(id);
  const heroStatus = $('hero-status');
  const heroOverlay = $('hero-overlay');
  const heroSkeleton = $('hero-skeleton');
  const heroScene = $('hero-scene');

  // ---------------- Toast ----------------
  let toastEl;
  function toast(msg){
    if(!toastEl){
      toastEl = document.createElement('div');
      toastEl.className='toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(()=>toastEl.classList.remove('show'), 3200);
  }

  // ---------------- Flag emoji ----------------
  function flagEmoji(countryCode){
    if(!countryCode || countryCode.length!==2) return '🌐';
    const codePoints = countryCode.toUpperCase().split('').map(c => 127397 + c.charCodeAt());
    return String.fromCodePoint(...codePoints);
  }

  // ---------------- Weather code mapping ----------------
  const WMO = {
    0:{label:'Clear sky', cat:'clear'},
    1:{label:'Mainly clear', cat:'clear'},
    2:{label:'Partly cloudy', cat:'cloudy'},
    3:{label:'Overcast', cat:'cloudy'},
    45:{label:'Fog', cat:'fog'},
    48:{label:'Rime fog', cat:'fog'},
    51:{label:'Light drizzle', cat:'rain'},
    53:{label:'Drizzle', cat:'rain'},
    55:{label:'Dense drizzle', cat:'rain'},
    56:{label:'Freezing drizzle', cat:'rain'},
    57:{label:'Freezing drizzle', cat:'rain'},
    61:{label:'Slight rain', cat:'rain'},
    63:{label:'Rain', cat:'rain'},
    65:{label:'Heavy rain', cat:'rain'},
    66:{label:'Freezing rain', cat:'rain'},
    67:{label:'Freezing rain', cat:'rain'},
    71:{label:'Slight snow', cat:'snow'},
    73:{label:'Snow', cat:'snow'},
    75:{label:'Heavy snow', cat:'snow'},
    77:{label:'Snow grains', cat:'snow'},
    80:{label:'Rain showers', cat:'rain'},
    81:{label:'Rain showers', cat:'rain'},
    82:{label:'Violent rain showers', cat:'rain'},
    85:{label:'Snow showers', cat:'snow'},
    86:{label:'Heavy snow showers', cat:'snow'},
    95:{label:'Thunderstorm', cat:'storm'},
    96:{label:'Thunderstorm, hail', cat:'storm'},
    99:{label:'Thunderstorm, heavy hail', cat:'storm'}
  };
  const wmoInfo = (code) => WMO[code] || {label:'Unknown', cat:'clear'};

  // ---------------- Icons (line style) ----------------
  function icon(cat, isDay){
    const s = `stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
    if(cat==='clear'){
      return isDay
        ? `<svg viewBox="0 0 24 24" ${s}><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.4M12 19.6V22M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2 12h2.4M19.6 12H22M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"/></svg>`
        : `<svg viewBox="0 0 24 24" ${s}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>`;
    }
    if(cat==='cloudy'){
      return `<svg viewBox="0 0 24 24" ${s}><path d="M7 18h10.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.7A4 4 0 0 0 7 18z"/></svg>`;
    }
    if(cat==='fog'){
      return `<svg viewBox="0 0 24 24" ${s}><path d="M4 9h11M4 13h16M4 17h11" /></svg>`;
    }
    if(cat==='rain'){
      return `<svg viewBox="0 0 24 24" ${s}><path d="M7 15h10.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.7A4 4 0 0 0 7 15z"/><path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2"/></svg>`;
    }
    if(cat==='snow'){
      return `<svg viewBox="0 0 24 24" ${s}><path d="M7 13h10.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.7A4 4 0 0 0 7 13z"/><path d="M8 18v3M8 18l-1.7 1M8 18l1.7 1M12 18v3M12 18l-1.7 1M12 18l1.7 1M16 18v3M16 18l-1.7 1M16 18l1.7 1"/></svg>`;
    }
    if(cat==='storm'){
      return `<svg viewBox="0 0 24 24" ${s}><path d="M7 13h10a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.7A4 4 0 0 0 7 13z"/><path d="M13 15l-3 5h3l-2 4"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" ${s}><circle cx="12" cy="12" r="4"/></svg>`;
  }

  const smallIcons = {
    humidity:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z"/></svg>`,
    wind:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 8h10a2.5 2.5 0 1 0-2.5-2.5M3 12h14a2.5 2.5 0 1 1-2.5 2.5M3 16h8"/></svg>`,
    pressure:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    uv:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="14" r="4"/><path d="M12 2v3M4.5 8L6.5 9.5M19.5 8l-2 1.5M3 15h2M19 15h2"/></svg>`,
    visibility:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.5"/></svg>`,
    sunrise:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 8v4M8.5 9.5L10 11M15.5 9.5L14 11"/></svg>`,
    sunset:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 6v3M8.5 8.5L9.7 9.7M15.5 8.5L14.3 9.7"/></svg>`,
    precip:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10z"/></svg>`
  };

  // ---------------- Sky scene (signature element) ----------------
  function renderScene(container, {isDay, cat, cloudCover, sunFrac}){
    const w=1000,h=460;
    const skyPalettes = {
      dawn:   ['#2B2350','#7A4B6B','#F5A93F'],
      day:    ['#2E6FB0','#5FA8DA','#CFE8F7'],
      night:  ['#050814','#0B1230','#141B33'],
      overcastDay:['#3A4258','#5C6480','#8891A8'],
      overcastNight:['#04060D','#0A0E1C','#111A2E']
    };
    let key;
    if(isDay){
      key = cloudCover>60 ? 'overcastDay' : (sunFrac<0.15||sunFrac>0.85 ? 'dawn' : 'day');
    } else {
      key = cloudCover>60 ? 'overcastNight' : 'night';
    }
    const [c1,c2,c3] = skyPalettes[key];

    const arcCx=500, arcCy=460, arcR=380;
    const angle = Math.PI - (Math.max(0,Math.min(1,sunFrac)) * Math.PI);
    const bodyX = arcCx + arcR*Math.cos(angle);
    const bodyY = arcCy - arcR*Math.sin(angle);

    let body = '';
    if(isDay){
      body = `<circle cx="${bodyX}" cy="${bodyY}" r="46" fill="url(#sunGrad)"/>
               <circle cx="${bodyX}" cy="${bodyY}" r="70" fill="url(#sunHalo)"/>`;
    } else {
      body = `<circle cx="${bodyX}" cy="${bodyY}" r="34" fill="#EDEFF7" opacity="0.92"/>
               <circle cx="${bodyX-12}" cy="${bodyY-8}" r="30" fill="${c1}" opacity="0.55"/>`;
      let stars='';
      const rng = (seed)=>{ let x=Math.sin(seed*999)*10000; return x-Math.floor(x); };
      for(let i=0;i<40;i++){
        const sx = rng(i)*1000, sy = rng(i+50)*300;
        stars += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(rng(i+100)*1.4+0.3).toFixed(2)}" fill="#EDEFF7" opacity="${(rng(i+200)*0.6+0.25).toFixed(2)}"/>`;
      }
      body += stars;
    }

    let clouds='';
    const cloudCount = Math.round((cloudCover/100)*7);
    for(let i=0;i<cloudCount;i++){
      const cy = 60 + (i%4)*55 + (i*13)%40;
      const cx = (i*137)%1000;
      const scale = 0.7 + (i%3)*0.25;
      const dur = 60 + (i*7)%40;
      clouds += `<g style="animation:drift ${dur}s linear infinite; animation-delay:-${(i*9)%dur}s;" transform="translate(${cx},${cy}) scale(${scale})" opacity="${isDay?0.85:0.5}">
        <ellipse cx="0" cy="0" rx="55" ry="22" fill="#EDEFF7"/>
        <ellipse cx="34" cy="6" rx="38" ry="18" fill="#EDEFF7"/>
        <ellipse cx="-32" cy="8" rx="34" ry="16" fill="#EDEFF7"/>
      </g>`;
    }

    let precip='';
    if(cat==='rain' || cat==='storm'){
      let lines='';
      for(let i=0;i<28;i++){
        const x=(i*37)%1000, delay=(i*0.13)%1.6, dur=0.7+((i*7)%5)/10;
        lines += `<line x1="${x}" y1="-10" x2="${x-14}" y2="34" stroke="#55D6C0" stroke-width="2" stroke-linecap="round" opacity="0.55" style="animation:fall ${dur}s linear infinite; animation-delay:-${delay}s;"/>`;
      }
      precip = `<g clip-path="url(#frame)">${lines}</g>`;
    } else if(cat==='snow'){
      let flakes='';
      for(let i=0;i<26;i++){
        const x=(i*39)%1000, delay=(i*0.2)%3, dur=3+((i*7)%6)/2;
        flakes += `<circle cx="${x}" cy="-10" r="2.6" fill="#EDEFF7" opacity="0.75" style="animation:fallSlow ${dur}s linear infinite; animation-delay:-${delay}s;"/>`;
      }
      precip = `<g clip-path="url(#frame)">${flakes}</g>`;
    }

    let flash='';
    if(cat==='storm'){
      flash = `<rect x="0" y="0" width="${w}" height="${h}" fill="#EDEFF7" opacity="0" style="animation:flash 6s ease-in-out infinite;"/>`;
    }

    const svg = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="55%" stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c3}"/>
        </linearGradient>
        <radialGradient id="sunGrad">
          <stop offset="0%" stop-color="#FFE9BE"/>
          <stop offset="100%" stop-color="#F5A93F"/>
        </radialGradient>
        <radialGradient id="sunHalo">
          <stop offset="0%" stop-color="#F5A93F" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#F5A93F" stop-opacity="0"/>
        </radialGradient>
        <clipPath id="frame"><rect x="0" y="0" width="${w}" height="${h}"/></clipPath>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0B0F1E" stop-opacity="0"/>
          <stop offset="100%" stop-color="#0B0F1E" stop-opacity="0.55"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${w}" height="${h}" fill="url(#skyGrad)"/>
      ${body}
      ${clouds}
      ${precip}
      ${flash}
      <rect x="0" y="0" width="${w}" height="${h}" fill="url(#fade)"/>
      <style>
        @keyframes drift{ from{ transform-origin:center; } to{ transform:translateX(1100px); } }
        @keyframes fall{ 0%{ transform:translateY(0); opacity:0;} 10%{opacity:0.55;} 100%{ transform:translateY(480px); opacity:0;} }
        @keyframes fallSlow{ 0%{ transform:translate(0,0); opacity:0;} 10%{opacity:0.8;} 100%{ transform:translate(30px,480px); opacity:0;} }
        @keyframes flash{ 0%,92%,100%{opacity:0;} 93%{opacity:0.5;} 94%{opacity:0;} 95%{opacity:0.35;} 96%{opacity:0;} }
      </style>
    </svg>`;
    container.innerHTML = svg;
    container.classList.add('ready');
  }

  // ---------------- Formatting helpers ----------------
  function cToDisplay(c){
    if(state.unit==='f') return Math.round(c*9/5+32);
    return Math.round(c);
  }
  function unitLabel(){ return state.unit==='f' ? '°F' : '°C'; }
  function kmhToDisplay(k){
    if(state.unit==='f') return Math.round(k*0.621371) + ' mph';
    return Math.round(k) + ' km/h';
  }
  function fmtTime(iso, tz){
    try{ return new Date(iso).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:tz}); }
    catch(e){ return new Date(iso).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}); }
  }
  function fmtHour(iso, tz){
    try{ return new Date(iso).toLocaleTimeString('en-US',{hour:'numeric',timeZone:tz}); }
    catch(e){ return new Date(iso).getHours()+':00'; }
  }
  function fmtWeekday(iso){ return new Date(iso+'T00:00:00').toLocaleDateString('en-US',{weekday:'short'}); }
  function fmtDate(iso){ return new Date(iso+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}); }
  function uvLabel(v){
    if(v<3) return 'Low';
    if(v<6) return 'Moderate';
    if(v<8) return 'High';
    if(v<11) return 'Very high';
    return 'Extreme';
  }

  // ---------------- Rendering ----------------
  function render(){
    const d = state.data;
    if(!d) return;
    heroStatus.classList.add('hidden');
    heroSkeleton.classList.add('hidden');
    heroOverlay.classList.add('show');

    const cur = d.current;
    const info = wmoInfo(cur.weather_code);
    const isDay = cur.is_day === 1;

    const today = d.daily;
    const sunrise = new Date(today.sunrise[0]).getTime();
    const sunset = new Date(today.sunset[0]).getTime();
    const now = new Date(cur.time).getTime();
    let sunFrac;
    if(isDay){
      sunFrac = (now - sunrise)/(sunset - sunrise);
    } else {
      const nextSunrise = new Date(today.sunrise[1] || today.sunrise[0]).getTime() + 86400000;
      sunFrac = now > sunset ? (now-sunset)/(nextSunrise-sunset) : 0.5;
    }
    sunFrac = Math.max(0,Math.min(1,sunFrac));

    renderScene(heroScene, {isDay, cat:info.cat, cloudCover:cur.cloud_cover, sunFrac});

    const flag = flagEmoji(state.countryCode);
    $('place-name').textContent = state.name + (state.admin ? ', ' + state.admin : '');
    $('place-meta').textContent = flag + ' ' + (state.country || '') + '  ·  ' + fmtDate(new Date().toISOString().slice(0,10)) + '  ·  ' + fmtTime(cur.time, state.tz);
    $('condition-badge').innerHTML = icon(info.cat, isDay) + '<span>' + info.label + '</span>';
    $('temp-num').textContent = cToDisplay(cur.temperature_2m);
    $('temp-unit').textContent = unitLabel();
    $('feels-like').textContent = cToDisplay(cur.apparent_temperature) + unitLabel();
    $('hi-lo').textContent = cToDisplay(today.temperature_2m_max[0]) + '° / ' + cToDisplay(today.temperature_2m_min[0]) + '°';
    $('updated-at').textContent = fmtTime(cur.time, state.tz);
    $('tz-note').textContent = 'Timezone: ' + state.tz;

    // hourly
    const h = d.hourly;
    const nowIdx = h.time.findIndex(t => new Date(t).getTime() >= now - 3600000);
    const startIdx = Math.max(0, nowIdx);
    const hourlyEl = $('hourly-strip');
    hourlyEl.innerHTML='';
    for(let i=startIdx;i<Math.min(startIdx+24, h.time.length);i++){
      const hi = wmoInfo(h.weather_code[i]);
      const isD = h.is_day ? h.is_day[i]===1 : true;
      const card = document.createElement('div');
      card.className='hour-card' + (i===startIdx ? ' now' : '');
      card.innerHTML = `<div class="t">${i===startIdx ? 'Now' : fmtHour(h.time[i], state.tz)}</div>
        ${icon(hi.cat, isD)}
        <div class="v">${cToDisplay(h.temperature_2m[i])}°</div>
        <div class="p">${h.precipitation_probability && h.precipitation_probability[i]>0 ? h.precipitation_probability[i]+'%' : ''}</div>`;
      hourlyEl.appendChild(card);
    }
    $('hourly-sub').textContent = state.tz;

    // daily
    const dl = d.daily;
    const dailyEl = $('daily-list');
    dailyEl.innerHTML='';
    const globalMax = Math.max(...dl.temperature_2m_max);
    const globalMin = Math.min(...dl.temperature_2m_min);
    for(let i=0;i<dl.time.length;i++){
      const di = wmoInfo(dl.weather_code[i]);
      const lo = dl.temperature_2m_min[i], hiT = dl.temperature_2m_max[i];
      const leftPct = ((lo-globalMin)/(globalMax-globalMin || 1))*100;
      const widthPct = ((hiT-lo)/(globalMax-globalMin || 1))*100;
      const row = document.createElement('div');
      row.className='day-row';
      row.innerHTML = `
        <div><div class="dname">${i===0?'Today':fmtWeekday(dl.time[i])}</div><div class="ddate">${fmtDate(dl.time[i])}</div></div>
        ${icon(di.cat, true)}
        <div class="bar-track"><div class="bar-fill" style="left:${leftPct}%;width:${Math.max(widthPct,4)}%;"></div></div>
        <div class="day-temps"><span class="lo">${cToDisplay(lo)}°</span><span>${cToDisplay(hiT)}°</span></div>
      `;
      dailyEl.appendChild(row);
    }

    // details
    const uvNow = (h.uv_index && h.uv_index[startIdx]!==undefined) ? h.uv_index[startIdx] : dl.uv_index_max[0];
    const visNow = (h.visibility && h.visibility[startIdx]!==undefined) ? (h.visibility[startIdx]/1000) : null;
    const details = [
      {label:'Humidity', icon:smallIcons.humidity, value:Math.round(cur.relative_humidity_2m)+'<small>%</small>'},
      {label:'Wind', icon:smallIcons.wind, value:kmhToDisplay(cur.wind_speed_10m)},
      {label:'Pressure', icon:smallIcons.pressure, value:Math.round(cur.pressure_msl)+'<small> hPa</small>'},
      {label:'UV Index', icon:smallIcons.uv, value:Math.round(uvNow)+'<small> '+uvLabel(uvNow)+'</small>'},
      {label:'Visibility', icon:smallIcons.visibility, value: visNow!==null ? visNow.toFixed(1)+'<small> km</small>' : '—'},
      {label:'Sunrise', icon:smallIcons.sunrise, value:fmtTime(dl.sunrise[0], state.tz)},
      {label:'Sunset', icon:smallIcons.sunset, value:fmtTime(dl.sunset[0], state.tz)},
      {label:'Precipitation', icon:smallIcons.precip, value:(dl.precipitation_sum[0]||0).toFixed(1)+'<small> mm today</small>'}
    ];
    const grid = $('detail-grid');
    grid.innerHTML='';
    details.forEach(item=>{
      const card = document.createElement('div');
      card.className='detail-card';
      card.innerHTML = `<div class="label">${item.icon}${item.label}</div><div class="value">${item.value}</div>`;
      grid.appendChild(card);
    });

    ['hourly-section','daily-section','detail-section'].forEach(id => $(id).classList.add('ready'));
  }

  // ---------------- Data fetching ----------------
  async function fetchWeather(lat, lon){
    const params = new URLSearchParams({
      latitude: lat, longitude: lon,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m',
      hourly: 'temperature_2m,weather_code,precipitation_probability,visibility,uv_index,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum',
      timezone: 'auto',
      forecast_days: '7'
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if(!res.ok) throw new Error('Weather service unavailable');
    return res.json();
  }

  function resetHeroForLoading(msg){
    heroStatus.classList.remove('hidden','error');
    heroStatus.textContent = msg;
    heroOverlay.classList.remove('show');
    heroSkeleton.classList.remove('hidden');
    heroScene.classList.remove('ready');
    ['hourly-section','daily-section','detail-section'].forEach(id => $(id).classList.remove('ready'));
  }

  async function loadLocation(lat, lon, name, admin, country, countryCode, tz){
    resetHeroForLoading('Reading the sky over ' + (name||'your location') + '…');
    try{
      const data = await fetchWeather(lat, lon);
      state.lat=lat; state.lon=lon; state.name=name; state.admin=admin;
      state.country=country; state.countryCode=countryCode;
      state.tz = tz || data.timezone;
      state.data = data;
      render();
      localStorage.setItem('aloft_last', JSON.stringify({lat,lon,name,admin,country,countryCode,tz:state.tz}));
    }catch(err){
      heroStatus.classList.add('error');
      heroStatus.classList.remove('hidden');
      heroSkeleton.classList.add('hidden');
      heroStatus.textContent = "Couldn't load weather for this place. Check your connection and try again.";
      toast('Failed to fetch weather data');
    }
  }

  // ---------------- Forward geocoding (search) ----------------
  let searchDebounce, searchAbort;
  const input = $('search-input');
  const suggBox = $('suggestions');
  const spinner = $('search-spinner');

  input.addEventListener('input', ()=>{
    clearTimeout(searchDebounce);
    const q = input.value.trim();
    if(q.length<2){ suggBox.classList.remove('open'); spinner.classList.remove('on'); return; }
    spinner.classList.add('on');
    searchDebounce = setTimeout(()=>doSearch(q), 320);
  });

  document.addEventListener('click', (e)=>{
    if(!suggBox.contains(e.target) && e.target!==input) suggBox.classList.remove('open');
  });

  async function doSearch(q){
    if(searchAbort) searchAbort.abort();
    searchAbort = new AbortController();
    try{
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`, {signal:searchAbort.signal});
      const data = await res.json();
      spinner.classList.remove('on');
      suggBox.innerHTML='';
      if(!data.results || data.results.length===0){
        suggBox.innerHTML = `<button disabled>No matches — try a different spelling</button>`;
        suggBox.classList.add('open');
        return;
      }
      data.results.forEach(r=>{
        const btn = document.createElement('button');
        const region = [r.admin1, r.country].filter(Boolean).join(', ');
        btn.innerHTML = `<span class="flag">${flagEmoji(r.country_code)}</span><span class="info"><span class="name">${r.name}</span><span class="region">${region}</span></span>`;
        btn.addEventListener('click', ()=>{
          suggBox.classList.remove('open');
          input.value = r.name;
          loadLocation(r.latitude, r.longitude, r.name, r.admin1, r.country, r.country_code, r.timezone);
        });
        suggBox.appendChild(btn);
      });
      suggBox.classList.add('open');
    }catch(e){
      if(e.name!=='AbortError') spinner.classList.remove('on');
    }
  }

  input.addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){
      const first = suggBox.querySelector('button:not([disabled])');
      if(first) first.click();
    }
    if(e.key==='Escape') suggBox.classList.remove('open');
  });

  // ---------------- Reverse geocoding (for "use my location") ----------------
  async function reverseGeocode(lat, lon){
    try{
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
      const data = await res.json();
      return {
        name: data.city || data.locality || data.principalSubdivision || 'Your location',
        admin: data.principalSubdivision || '',
        country: data.countryName || '',
        countryCode: data.countryCode || ''
      };
    }catch(e){
      return { name:'Your location', admin:'', country:'', countryCode:'' };
    }
  }

  // ---------------- Geolocation ----------------
  const locateBtn = $('locate-btn');
  locateBtn.addEventListener('click', ()=>{
    if(!navigator.geolocation){
      toast('Geolocation is not available in this browser.');
      return;
    }
    locateBtn.classList.add('loading');
    resetHeroForLoading('Locating you…');
    navigator.geolocation.getCurrentPosition(async (pos)=>{
      const {latitude, longitude} = pos.coords;
      const place = await reverseGeocode(latitude, longitude);
      locateBtn.classList.remove('loading');
      loadLocation(latitude, longitude, place.name, place.admin, place.country, place.countryCode, null);
    }, ()=>{
      locateBtn.classList.remove('loading');
      heroStatus.classList.add('error');
      heroStatus.classList.remove('hidden');
      heroSkeleton.classList.add('hidden');
      heroStatus.textContent = "Location access denied. Search for a city instead.";
    }, {timeout:10000});
  });

  // ---------------- Unit toggle ----------------
  function setUnit(u){
    state.unit = u;
    localStorage.setItem('aloft_unit', u);
    $('unit-c').classList.toggle('active', u==='c');
    $('unit-f').classList.toggle('active', u==='f');
    if(state.data) render();
  }
  $('unit-c').addEventListener('click', ()=>setUnit('c'));
  $('unit-f').addEventListener('click', ()=>setUnit('f'));
  setUnit(state.unit);

  // ---------------- Init ----------------
  (function init(){
    const last = localStorage.getItem('aloft_last');
    if(last){
      try{
        const l = JSON.parse(last);
        loadLocation(l.lat, l.lon, l.name, l.admin, l.country, l.countryCode, l.tz);
        return;
      }catch(e){}
    }
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(async (pos)=>{
        const {latitude, longitude} = pos.coords;
        const place = await reverseGeocode(latitude, longitude);
        loadLocation(latitude, longitude, place.name, place.admin, place.country, place.countryCode, null);
      }, ()=>{
        loadLocation(24.8607, 67.0011, 'Karachi', 'Sindh', 'Pakistan', 'PK', 'Asia/Karachi');
      }, {timeout:6000});
    } else {
      loadLocation(24.8607, 67.0011, 'Karachi', 'Sindh', 'Pakistan', 'PK', 'Asia/Karachi');
    }
  })();

})();