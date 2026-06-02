import * as XLSX from 'xlsx';

function parsearFecha(valor) {
  if (!valor && valor !== 0) return null;
  if (typeof valor === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + valor * 86400000);
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  const matchDMY = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (matchDMY) {
    const d = new Date(parseInt(matchDMY[3]), parseInt(matchDMY[2]) - 1, parseInt(matchDMY[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export async function parsearExcelYape(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

        let headerRow = -1;
        for (let i = 0; i < Math.min(rows.length, 15); i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const rowStr = row.map((c) => String(c || '').toLowerCase().trim()).join(' ');
          if (rowStr.includes('fecha') && (rowStr.includes('monto') || rowStr.includes('importe')) && (rowStr.includes('descrip') || rowStr.includes('destino') || rowStr.includes('concepto') || rowStr.includes('comercio') || rowStr.includes('proveedor') || rowStr.includes('tipo'))) {
            headerRow = i;
            break;
          }
        }
        if (headerRow === -1) headerRow = 0;

        const headers = rows[headerRow].map((h) => String(h || '').toLowerCase().trim());
        const idxFecha = headers.findIndex((h) => h.includes('fecha'));
        const idxDesc = headers.findIndex((h) => h.includes('destino') || h.includes('descrip') || h.includes('concepto') || h.includes('detalle') || h.includes('comercio') || h.includes('proveedor') || h.includes('beneficiario'));
        const idxMonto = headers.findIndex((h) => h.includes('monto') || h.includes('importe') || h.includes('cargo'));
        const idxSaldo = headers.findIndex((h) => h.includes('saldo'));
        const idxTipo = headers.findIndex((h) => h.includes('tipo') || h.includes('transacción'));
        const idxOrigen = headers.findIndex((h) => h.includes('origen'));
        const idxMensaje = headers.findIndex((h) => h.includes('mensaje') || h.includes('referencia') || h.includes('glosa'));

        if (idxFecha === -1 || idxDesc === -1 || idxMonto === -1) {
          reject(new Error('No se encontraron las columnas requeridas. Columnas detectadas: ' + headers.join(', ')));
          return;
        }

        const gastos = [];
        let filasLeidas = 0;
        let filasSaltadas = 0;

        for (let i = headerRow + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const fechaRaw = row[idxFecha];
          const descripcion = String(row[idxDesc] || '').trim();
          let descFinal = descripcion;
          if (!descFinal && idxOrigen !== -1) descFinal = String(row[idxOrigen] || '').trim();
          const montoRaw = row[idxMonto];

          if (!fechaRaw || montoRaw === undefined || montoRaw === null) { filasSaltadas++; continue; }

          const fecha = parsearFecha(fechaRaw);
          if (!fecha) { filasSaltadas++; continue; }

          let monto = parseFloat(String(montoRaw).replace(/[^0-9.,-]/g, '').replace(',', '.'));
          if (isNaN(monto)) { filasSaltadas++; continue; }

          const montoAbs = Math.abs(monto);
          let tipo = 'gasto';
          if (idxTipo !== -1) {
            const t = String(row[idxTipo] || '').toUpperCase();
            if (t.includes('TE_PAGO') || t.includes('INGRESO') || t.includes('ABONO') || t.includes('RECIBIDO')) tipo = 'ingreso';
            else tipo = 'gasto';
          } else {
            tipo = 'gasto';
          }

          gastos.push({
            fecha: fecha.toISOString().split('T')[0],
            descripcion: descFinal,
            monto: montoAbs,
            tipo,
            mensaje: idxMensaje !== -1 ? String(row[idxMensaje] || '').trim() || null : null,
            saldo: idxSaldo !== -1 ? parseFloat(String(row[idxSaldo] || '0').replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0 : 0,
          });
          filasLeidas++;
        }

        resolve({ gastos, resumen: { leidas: filasLeidas, saltadas: filasSaltadas, totalFilas: rows.length - headerRow - 1 } });
      } catch (err) {
        reject(new Error('Error al leer el archivo: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}
