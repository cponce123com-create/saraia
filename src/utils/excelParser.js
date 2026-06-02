import * as XLSX from 'xlsx';

/**
 * Parsea un archivo Excel de Yape Empresas y extrae los gastos.
 * 
 * Formato esperado (típico de Yape Empresas):
 * - Hoja: "Historial" o la primera hoja
 * - Columnas: Fecha, Descripción, Monto, Saldo
 * - Fila 1: encabezados
 * - Filas 2+: datos
 * 
 * @param {File} file - Archivo .xlsx
 * @returns {Promise<Array<{fecha: string, descripcion: string, monto: number, tipo: string}>>}
 */
export async function parsearExcelYape(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Usar la primera hoja disponible
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convertir a JSON (header: 1 → array de arrays)
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Buscar fila de encabezados
        let headerRow = -1;
        for (let i = 0; i < Math.min(rows.length, 15); i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const rowStr = row.map((c) => String(c || '').toLowerCase().trim()).join(' ');
          
          // Yape Empresas: "Tipo de Transacción | Origen | Destino | Monto | Mensaje | Fecha de operación"
          // Bancos: "Fecha | Descripción | Monto | Saldo"
          const tieneFecha = rowStr.includes('fecha');
          const tieneMonto = rowStr.includes('monto') || rowStr.includes('importe');
          const tieneDesc = rowStr.includes('descrip') || rowStr.includes('destino') || 
                           rowStr.includes('concepto') || rowStr.includes('detalle') || 
                           rowStr.includes('comercio') || rowStr.includes('proveedor');
          const tieneTipo = rowStr.includes('tipo');
          
          if (tieneFecha && tieneMonto && (tieneDesc || tieneTipo)) {
            headerRow = i;
            break;
          }
        }

        if (headerRow === -1) {
          headerRow = 0;
        }

        const headers = rows[headerRow].map((h) => String(h || '').toLowerCase().trim());
        
        // Mapear índices de columnas
        const idxFecha = headers.findIndex(
          (h) => h.includes('fecha')
        );
        const idxDesc = headers.findIndex(
          (h) => h.includes('destino') || h.includes('descrip') || h.includes('concepto') || 
                h.includes('detalle') || h.includes('comercio') || h.includes('proveedor') ||
                h.includes('beneficiario')
        );
        const idxMonto = headers.findIndex(
          (h) => h.includes('monto') || h.includes('importe') || h.includes('total') || h.includes('cargo')
        );
        const idxSaldo = headers.findIndex(
          (h) => h.includes('saldo') || h.includes('disponible')
        );
        const idxTipo = headers.findIndex(
          (h) => h.includes('tipo') || h.includes('transacción')
        );
        const idxOrigen = headers.findIndex(
          (h) => h.includes('origen') || h.includes('cuenta') || h.includes('de')
        );
        const idxMensaje = headers.findIndex(
          (h) => h.includes('mensaje') || h.includes('referencia') || h.includes('glosa')
        );

        if (idxFecha === -1 || idxDesc === -1 || idxMonto === -1) {
          reject(new Error(
            'No se encontraron las columnas requeridas.\n\n' +
            'El archivo debe tener columnas como: Fecha, Descripción/Destino, Monto.\n' +
            'Formato esperado de Yape Empresas:\n' +
            '  Tipo de Transacción | Origen | Destino | Monto | Mensaje | Fecha de operación\n\n' +
            'Columnas detectadas: ' + headers.join(', ')
          ));
          return;
        }

        // Extraer datos
        const gastos = [];
        for (let i = headerRow + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const fechaRaw = row[idxFecha];
          const descripcion = row[idxDesc]?.toString().trim() || '';

          // Si hay columna Origen, usarla como descripción alternativa
          let descFinal = descripcion;
          if (!descFinal && idxOrigen !== -1) {
            descFinal = String(row[idxOrigen] || '').trim();
          }

          const montoRaw = row[idxMonto];
          const mensajeRaw = idxMensaje !== -1 ? row[idxMensaje] : null;

          if (!fechaRaw || montoRaw === undefined || montoRaw === null) continue;

          // Parsear fecha
          let fecha;
          if (typeof fechaRaw === 'number') {
            // Número serial de Excel
            const excelEpoch = new Date(1899, 11, 30);
            fecha = new Date(excelEpoch.getTime() + fechaRaw * 86400000);
          } else {
            fecha = new Date(fechaRaw);
          }

          if (isNaN(fecha.getTime())) continue;

          // Parsear monto
          let monto = parseFloat(String(montoRaw).replace(/[^0-9.-]/g, ''));
          if (isNaN(monto)) continue;

          // Determinar tipo: ingreso o gasto
          let tipo = 'gasto';
          let montoAbs = Math.abs(monto);

          // Si hay columna tipo, usarla (Yape: PAGASTE = gasto, TE_PAGO = ingreso)
          if (idxTipo !== -1) {
            const tipoStr = String(row[idxTipo] || '').toUpperCase();
            if (tipoStr.includes('TE_PAGO') || tipoStr.includes('PAGO RECIBIDO') || 
                tipoStr.includes('INGRESO') || tipoStr.includes('ABONO')) {
              tipo = 'ingreso';
            } else if (tipoStr.includes('PAGASTE') || tipoStr.includes('PAGO') || 
                       tipoStr.includes('RETIRO') || tipoStr.includes('CARGO')) {
              tipo = 'gasto';
            }
          } else if (monto > 0) {
            // Sin columna tipo: monto positivo = ingreso
            tipo = 'ingreso';
          }

          gastos.push({
            fecha: fecha.toISOString().split('T')[0],
            descripcion: descFinal,
            monto: montoAbs,
            tipo,
            mensaje: mensajeRaw?.toString().trim() || null,
            fechaRaw,
            saldo: idxSaldo !== -1 ? parseFloat(String(row[idxSaldo] || '0').replace(/[^0-9.-]/g, '')) || 0 : 0,
          });
        }

        resolve(gastos);
      } catch (err) {
        reject(new Error(`Error al leer el archivo: ${err.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}
