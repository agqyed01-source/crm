const XLSX = require('xlsx');

// Mock exactly what's in the screenshot roughly
const ws_data = [
  ['收件人名称', '收货地址', '收货国家', '州/省', '城市', '地址', '邮编', '联系邮件', '国家区号', '联系电话', '税号'],
  ['Valeri Lezama Quispe', 'calle tarapa #116', 'Peru', 'CUSCO', 'CUSCO', 'calle tarap...', '08004', '', '51', '992747898', '']
];
const ws = XLSX.utils.aoa_to_sheet(ws_data);
const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

const processData = (data) => {
  const getVal = (row, keywords) => {
    // Try strict exact match first
    let key = Object.keys(row).find(k => keywords.some(kw => k.toLowerCase().trim() === kw.toLowerCase().trim()));
    // Try substring match if no exact match
    if (!key) {
       key = Object.keys(row).find(k => keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase().trim())));
    }
    
    let val = key ? row[key] : undefined;
    if (val === undefined || val === null) return '';
    return String(val).replace(/\.0$/, '').trim();
  };

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    console.log("Parsed row:", row);
    console.log("Name:", getVal(row, ['收件人名称', '收件人名', 'name', '买家名称']));
    console.log("CountryCode:", getVal(row, ['国家区号', 'country code', '区号']));
    console.log("Phone:", getVal(row, ['联系电话', '手机', '电话', 'phone', 'mobile']));
    
  }
};
processData(json);
