/**
 * Actualiza los 7 templates de boleta con el diseño mejorado.
 * Ejecutar: node scripts/update-templates.js
 */
const fs = require("fs");
const path = require("path");

const templatesDir = path.join(__dirname, "..", "templates");

const TEMPLATE = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <title>Boleta de Pago</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: Verdana, Sans-serif;
            font-size: 10px;
            color: #000;
            padding: 18px 22px;
        }

        /* ── Encabezado ── */
        .header {
            display: flex;
            align-items: center;
            border-bottom: 1.5px solid #000;
            padding-bottom: 6px;
            margin-bottom: 4px;
        }
        .header img { width: 42px; flex-shrink: 0; }
        .header-title {
            flex: 1;
            text-align: center;
            font-family: Helvetica, Sans-Serif;
            font-size: 13px;
            font-weight: bold;
            letter-spacing: 5px;
            text-transform: uppercase;
        }
        .header-spacer { width: 42px; flex-shrink: 0; }

        /* ── Nombre empresa ── */
        .empresa-nombre {
            background: rgb(242, 240, 240);
            text-align: center;
            font-family: Helvetica, Sans-Serif;
            font-size: 14px;
            font-weight: bold;
            letter-spacing: 3px;
            text-transform: uppercase;
            padding: 7px 4px;
            margin-top: 6px;
        }
        .empresa-nit {
            text-align: center;
            font-family: Helvetica, Sans-Serif;
            font-size: 9px;
            letter-spacing: 1px;
            padding: 5px 0 10px 0;
        }

        /* ── Info empleado ── */
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .info-table th {
            font: bold 10px Verdana, Sans-serif;
            background: rgb(242, 240, 240);
            text-align: right;
            padding: 3px 6px;
            white-space: nowrap;
        }
        .info-table td {
            font: 10px Verdana, Sans-serif;
            text-align: left;
            padding: 3px 6px;
        }

        /* ── Detalle de pago (tabla generada por el SP) ── */
        .detalle-wrapper table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
        }
        .detalle-wrapper table th,
        .detalle-wrapper table td {
            border: 0.5px solid #aaa;
            padding: 4px 7px;
            font: 10px Verdana, Sans-serif;
        }
        /* Fila titulo "Detalle de pago" (primera fila del thead o primer tr) */
        .detalle-wrapper table thead tr:first-child th {
            background: transparent;
            color: #000;
            text-align: center;
            font-size: 11px;
            letter-spacing: 1px;
            border: none;
            border-bottom: 1px solid #aaa;
        }
        /* Fila cabecera de columnas (segunda fila del thead) */
        .detalle-wrapper table thead tr:last-child th {
            background: rgb(242, 240, 240);
            color: #000;
            text-align: center;
        }
        /* Columna concepto: izquierda */
        .detalle-wrapper table tbody td:first-child { text-align: left; }
        /* Columnas montos: derecha */
        .detalle-wrapper table tbody td:not(:first-child) { text-align: right; }
        /* Fila TOTALES (ultimo tr del tbody) */
        .detalle-wrapper table tbody tr:last-child td {
            font-weight: bold;
            background: rgb(242, 240, 240);
            text-align: right;
        }
        .detalle-wrapper table tbody tr:last-child td:first-child { text-align: center; }

        /* ── Pie ── */
        .footer {
            border-top: 1px solid #000;
            margin-top: 14px;
            padding-top: 5px;
            font: 10px Verdana, Sans-serif;
            line-height: 1.7;
        }
    </style>
</head>
<body>

    <!-- Encabezado -->
    <div class="header">
        <img src="{{LogoEmpresa}}" alt="Logo"/>
        <div class="header-title">Boleta de Pago</div>
        <div class="header-spacer"></div>
    </div>

    <!-- Empresa -->
    <div class="empresa-nombre">{{Empresa}}</div>
    <div class="empresa-nit">{{NitEmpresa}}</div>

    <!-- Datos del empleado -->
    <table class="info-table">
        <tr>
            <th>Empleado</th>
            <td>{{Empleado}}</td>
            <th>Fecha Impresion</th>
            <td>{{FechaImpresion}}</td>
        </tr>
        <tr>
            <th>Cargo</th>
            <td>{{Cargo}}</td>
            <th>Periodo</th>
            <td>{{RangoPeriodo}}</td>
        </tr>
        <tr>
            <th>Departamento</th>
            <td>{{Departamento}}</td>
            <th>Area</th>
            <td>{{Area}}</td>
        </tr>
        <tr>
            <th>No Boleta de Pago / Voucher</th>
            <td colspan="3">{{NoBoleta}}</td>
        </tr>
    </table>

    <!-- Detalle generado por el SP -->
    <div class="detalle-wrapper">
        {{DetalleHTML}}
    </div>

    <!-- Pie -->
    <div class="footer">
        <div><strong>LIQUIDO A RECIBIR:</strong> {{LiquidoARecibir}}</div>
        <div><strong>Recib\u00ed conforme la cantidad de:</strong> **{{CantidadLetras}}**</div>
        <div><strong>Nit Empleado:</strong> {{NitEmpleado}}</div>
    </div>

</body>
</html>`;

const files = [
  "boleta-pralcasa.html",
  "boleta-advert.html",
  "boleta-alimenti.html",
  "boleta-altoplast.html",
  "boleta-disalto.html",
  "boleta-maqusa.html",
  "boleta-salinas.html",
];

for (const file of files) {
  fs.writeFileSync(path.join(templatesDir, file), TEMPLATE, "utf-8");
  console.log(`Actualizado: ${file}`);
}
console.log("Listo.");
