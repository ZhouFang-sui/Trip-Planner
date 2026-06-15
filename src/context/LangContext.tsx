'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

export const LANG_CODES: Record<string, string> = {
  'English': 'en',
  'Spanish': 'es',
  'French': 'fr',
  'Chinese (Simplified)': 'zh-CN',
  'Chinese (Traditional)': 'zh-TW',
  'Japanese': 'ja',
  'Korean': 'ko',
  'Thai': 'th',
};

// UI translation table
const T: Record<string, Record<string, string>> = {
  en:    { map:'Map', itinerary:'Itinerary', expenses:'Expenses', documents:'Documents', clearAll:'Clear All', settings:'Settings', currency:'Currency', language:'Language', confirm:'Confirm', add:'Add', search:'Search for a place...', workspace:'Workspace', trips:'Trips', smartRouter:'Smart Router', transit:'Transit', driving:'Driving', walking:'Walking', bicycling:'Bicycling', transportOptions:'Transportation Options', tripSummary:'Trip Summary', distance:'Distance', estTime:'Est. Time', fastest:'Fastest', famousSites:'Famous Sites Nearby', discover:'Discover', waypoints:'Waypoints', note:'Note', exploreTours:'Explore Nearby Tours', address:'Address', searchMaps:'Search on Google Maps →', hours:'Hours', reviews:'Reviews', routeBreakdown:'Route Breakdown', routeUpdated:'Route Updated!', addMorePlaces:'Add more places to optimize', findShortest:'✨ Find Best Shortest Route', recommendedOrder:'Recommended Order:', calcShortest:'Calculating Shortest Route...', stops:'Stops' },
  es:    { map:'Mapa', itinerary:'Itinerario', expenses:'Gastos', documents:'Documentos', clearAll:'Limpiar todo', settings:'Ajustes', currency:'Moneda', language:'Idioma', confirm:'Confirmar', add:'Agregar', search:'Buscar un lugar...', workspace:'Espacio de trabajo', trips:'Viajes', smartRouter:'Ruta Inteligente', transit:'Transporte', driving:'Conduciendo', walking:'Caminando', bicycling:'Bicicleta', transportOptions:'Opciones de Transporte', tripSummary:'Resumen del Viaje', distance:'Distancia', estTime:'Tiempo Est.', fastest:'Más Rápido', famousSites:'Sitios Famosos', discover:'Descubrir', waypoints:'Puntos', note:'Nota', exploreTours:'Explorar Tours', address:'Dirección', searchMaps:'Buscar en Google Maps →', hours:'Horarios', reviews:'Reseñas', routeBreakdown:'Detalles de Ruta', routeUpdated:'¡Ruta Actualizada!', addMorePlaces:'Añade más lugares', findShortest:'✨ Mejor Ruta Corta', recommendedOrder:'Orden Recomendado:', calcShortest:'Calculando Ruta...', stops:'Paradas' },
  fr:    { map:'Carte', itinerary:'Itinéraire', expenses:'Dépenses', documents:'Documents', clearAll:'Tout effacer', settings:'Paramètres', currency:'Devise', language:'Langue', confirm:'Confirmer', add:'Ajouter', search:'Rechercher un lieu...', workspace:'Espace de travail', trips:'Voyages', smartRouter:'Trajet Intelligent', transit:'Transport', driving:'Conduite', walking:'Marche', bicycling:'Vélo', transportOptions:'Options de Transport', tripSummary:'Résumé du Trajet', distance:'Distance', estTime:'Temps Est.', fastest:'Le Plus Rapide', famousSites:'Sites Célèbres', discover:'Découvrir', waypoints:'Points', note:'Note', exploreTours:'Explorer les visites', address:'Adresse', searchMaps:'Chercher sur Google Maps →', hours:'Horaires', reviews:'Avis', routeBreakdown:'Détails du Trajet', routeUpdated:'Trajet Mis à Jour !', addMorePlaces:'Ajoutez plus de lieux', findShortest:'✨ Meilleur Trajet', recommendedOrder:'Ordre Recommandé :', calcShortest:'Calcul en cours...', stops:'Arrêts' },
  'zh-CN': { map:'地图', itinerary:'行程', expenses:'费用', documents:'文件', clearAll:'清除全部', settings:'设置', currency:'货币', language:'语言', confirm:'确认', add:'添加', search:'搜索地点...', workspace:'工作区', trips:'旅行', smartRouter:'智能路线', transit:'公交', driving:'驾车', walking:'步行', bicycling:'骑行', transportOptions:'交通选项', tripSummary:'行程摘要', distance:'距离', estTime:'预计时间', fastest:'最快', famousSites:'附近著名景点', discover:'发现', waypoints:'途径点', note:'笔记', exploreTours:'探索附近游览', address:'地址', searchMaps:'在谷歌地图上搜索 →', hours:'营业时间', reviews:'评论', routeBreakdown:'路线详情', routeUpdated:'路线已更新！', addMorePlaces:'添加更多地点以优化', findShortest:'✨ 寻找最佳最短路线', recommendedOrder:'推荐顺序：', calcShortest:'正在计算最短路线...', stops:'停靠点' },
  'zh-TW': { map:'地圖', itinerary:'行程', expenses:'費用', documents:'文件', clearAll:'清除全部', settings:'設定', currency:'貨幣', language:'語言', confirm:'確認', add:'添加', search:'搜尋地點...', workspace:'工作區', trips:'旅行', smartRouter:'智能路線', transit:'大眾運輸', driving:'開車', walking:'走路', bicycling:'騎腳踏車', transportOptions:'交通選項', tripSummary:'行程摘要', distance:'距離', estTime:'預計時間', fastest:'最快', famousSites:'附近著名景點', discover:'發現', waypoints:'途經點', note:'筆記', exploreTours:'探索附近導覽', address:'地址', searchMaps:'在 Google 地圖上搜尋 →', hours:'營業時間', reviews:'評論', routeBreakdown:'路線詳情', routeUpdated:'路線已更新！', addMorePlaces:'添加更多地點以優化', findShortest:'✨ 尋找最佳最短路線', recommendedOrder:'推薦順序：', calcShortest:'正在計算最短路線...', stops:'停靠點' },
  ja:    { map:'マップ', itinerary:'旅程', expenses:'費用', documents:'書類', clearAll:'全て削除', settings:'設定', currency:'通貨', language:'言語', confirm:'確認', add:'追加', search:'場所を検索...', workspace:'ワークスペース', trips:'旅行', smartRouter:'スマートルーター', transit:'交通機関', driving:'運転', walking:'徒歩', bicycling:'自転車', transportOptions:'交通オプション', tripSummary:'旅行の概要', distance:'距離', estTime:'予想時間', fastest:'最速', famousSites:'有名な観光スポット', discover:'発見する', waypoints:'経由地', note:'ノート', exploreTours:'近隣のツアー', address:'住所', searchMaps:'Google マップで検索 →', hours:'営業時間', reviews:'レビュー', routeBreakdown:'ルート詳細', routeUpdated:'ルート更新！', addMorePlaces:'さらに場所を追加', findShortest:'✨ 最短ルートを検索', recommendedOrder:'推奨順序：', calcShortest:'計算中...', stops:'立ち寄り先' },
  ko:    { map:'지도', itinerary:'일정', expenses:'지출', documents:'서류', clearAll:'모두 지우기', settings:'설정', currency:'통화', language:'언어', confirm:'확인', add:'추가', search:'장소 검색...', workspace:'작업 공간', trips:'여행', smartRouter:'스마트 라우터', transit:'대중교통', driving:'운전', walking:'도보', bicycling:'자전거', transportOptions:'교통 옵션', tripSummary:'여행 요약', distance:'거리', estTime:'예상 시간', fastest:'가장 빠른', famousSites:'유명 명소', discover:'발견하다', waypoints:'경유지', note:'노트', exploreTours:'근처 투어 탐색', address:'주소', searchMaps:'Google 지도에서 검색 →', hours:'영업시간', reviews:'리뷰', routeBreakdown:'경로 세부 정보', routeUpdated:'경로 업데이트 됨!', addMorePlaces:'최적화를 위해 장소 추가', findShortest:'✨ 최적 최단 경로 찾기', recommendedOrder:'추천 순서:', calcShortest:'경로 계산 중...', stops:'정류장' },
  th:    { map:'แผนที่', itinerary:'ตารางการเดินทาง', expenses:'ค่าใช้จ่าย', documents:'เอกสาร', clearAll:'ล้างทั้งหมด', settings:'การตั้งค่า', currency:'สกุลเงิน', language:'ภาษา', confirm:'ยืนยัน', add:'เพิ่ม', search:'ค้นหาสถานที่...', workspace:'พื้นที่ทำงาน', trips:'การเดินทาง', smartRouter:'เส้นทางอัจฉริยะ', transit:'ขนส่งสาธารณะ', driving:'ขับรถ', walking:'เดิน', bicycling:'ปั่นจักรยาน', transportOptions:'ตัวเลือกการเดินทาง', tripSummary:'สรุปการเดินทาง', distance:'ระยะทาง', estTime:'เวลาโดยประมาณ', fastest:'เร็วที่สุด', famousSites:'สถานที่ที่มีชื่อเสียง', discover:'ค้นพบ', waypoints:'จุดแวะ', note:'บันทึก', exploreTours:'สำรวจทัวร์ใกล้เคียง', address:'ที่อยู่', searchMaps:'ค้นหาบน Google Maps →', hours:'เวลาทำการ', reviews:'รีวิว', routeBreakdown:'รายละเอียดเส้นทาง', routeUpdated:'อัปเดตเส้นทางแล้ว!', addMorePlaces:'เพิ่มสถานที่', findShortest:'✨ ค้นหาเส้นทางที่สั้นที่สุด', recommendedOrder:'ลำดับที่แนะนำ:', calcShortest:'กำลังคำนวณ...', stops:'จุดแวะ' },
};

interface LangContextValue {
  language: string;   // display name e.g. 'Chinese (Simplified)'
  langCode: string;   // ISO code e.g. 'zh-CN'
  currency: string;
  t: (key: string) => string;
  setLanguage: (l: string) => void;
  setCurrency: (c: string) => void;
}

const LangContext = createContext<LangContextValue>({
  language: 'English',
  langCode: 'en',
  currency: '$',
  t: (k) => k,
  setLanguage: () => {},
  setCurrency: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState('English');
  const [currency, setCurrency] = useState('$');
  const langCode = LANG_CODES[language] || 'en';

  const t = (key: string) => (T[langCode] || T['en'])[key] || key;

  return (
    <LangContext.Provider value={{ language, langCode, currency, t, setLanguage, setCurrency }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
