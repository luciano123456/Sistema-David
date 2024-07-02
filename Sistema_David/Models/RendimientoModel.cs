using Sistema_David.Models.DB;
using Sistema_David.Models.ViewModels;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Data;
using System.Linq;
using System.Web;
using System.Globalization;
using System.Data.Entity;
using System.Data.Entity.Core.Objects;

namespace Sistema_David.Models
{
    public class RendimientosModel
    {

        public static List<Rendimiento> ListaUsuarios()
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {

                var resultList = db.Database.SqlQuery<Rendimiento>(@"SELECT u.Id, CONCAT(u.Nombre, ' ', u.Apellido) AS Nombre, SUM(v.Entrega + v.Restante) AS Total FROM Usuarios u LEFT JOIN Ventas v ON v.idVendedor = u.Id GROUP BY u.Id, u.Nombre, u.Apellido").ToList();

                return resultList;
            }

        }



        public static List<RendimientoGeneral> MostrarRendimientoGeneral(DateTime fechaDesde, DateTime fechaHasta)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {


                if (fechaHasta < fechaDesde)
                {
                    return null;
                }

                // Obtener las ventas y cobranzas en memoria
                DateTime fechaHastaAjustada = fechaHasta.Date.AddDays(1).AddTicks(-1);

                var ventasCobranzas = db.InformacionVentas
                    .Where(iv => iv.Fecha >= fechaDesde.Date && iv.Fecha <= fechaHastaAjustada && (iv.Descripcion.Contains("Venta") || iv.Descripcion.Contains("Cobranza")))
                    .OrderBy(iv => iv.Fecha)
                    .ToList();

                // Asegurarse de que haya una entrada para cada día en el rango
                var fechasEnRango = Enumerable.Range(0, (int)(fechaHasta - fechaDesde).TotalDays + 1)
                    .Select(offset => fechaDesde.AddDays(offset).Date)
                    .ToList();

                // Combinar resultados en memoria con fechas en rango
                var result = fechasEnRango
                    .Select(fecha =>
                    {
                        var ventasDelDia = ventasCobranzas
                            .Where(iv => iv.Fecha?.Date == fecha && iv.Descripcion.Contains("Venta"))
                            .Sum(x => x.Entrega + x.Restante);

                        var cobranzasDelDia = ventasCobranzas
                            .Where(iv => iv.Fecha?.Date == fecha && (iv.Descripcion.Contains("Cobranza")))
                            .Sum(x => x.Descripcion.Contains("Cobranza") ? x.Entrega : 0);

                        return new RendimientoGeneral
                        {
                            Fecha = fecha.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture),  // Formato español
                            Ventas = (decimal)ventasDelDia,
                            Cobranza = (decimal)cobranzasDelDia,
                        };
                    })
                    .OrderByDescending(rendimiento => DateTime.ParseExact(rendimiento.Fecha, "dd/MM/yyyy", CultureInfo.InvariantCulture))
                    .ToList();

                foreach (var rendimiento in result)
                {
                    DateTime fechaRendimiento = DateTime.ParseExact(rendimiento.Fecha, "dd/MM/yyyy", CultureInfo.InvariantCulture);

                    rendimiento.CapitalInicial = db.Ventas
                        .Where(v => v.Fecha < fechaRendimiento)
                        .Sum(v => (decimal?)v.Restante) ?? 0;

                    rendimiento.CapitalFinal = rendimiento.CapitalInicial + rendimiento.Ventas - rendimiento.Cobranza;
                }

                return result;
            }
        }


        public static List<Rendimiento> MostrarRendimiento(int idVendedor, int ventas, int cobranzas, DateTime fechadesde, DateTime fechahasta)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                string query = @"
                        SELECT 
                            IV.Id, IV.IdVendedor, 
                            C.Nombre + ' ' + C.Apellido as Cliente, 
                            IV.IdVenta, 
                            SUM(IV.Entrega + IV.Restante) AS CapitalInicial, 
                            CASE WHEN IV.Descripcion LIKE '%venta%' THEN SUM(IV.Entrega + IV.Restante) ELSE 0 END AS Venta,
                            IV.Entrega AS Cobro, V.Restante,
                            IV.Restante AS CapitalFinal, IV.Interes, IV.Fecha, IV.Descripcion, IV.whatssap, IV.MetodoPago
                        FROM 
                            InformacionVentas IV
                            INNER JOIN Ventas V ON IV.IdVenta = V.Id
                            INNER JOIN CLIENTES C ON V.idCliente = c.Id
                        WHERE 
                            (IV.IdVendedor = @idVendedor OR @idVendedor = -99)
                            AND ((@ventas = 1 AND IV.Descripcion LIKE '%venta%') OR (@cobranzas = 1 AND IV.Descripcion LIKE '%cobranza%' or IV.Descripcion LIKE '%interes%'))
                            AND IV.Fecha >= @fechadesde AND IV.Fecha <= @fechahasta
                        GROUP BY 
                            IV.Id, IV.IdVenta, IV.Fecha, C.Nombre + ' ' + C.Apellido, IV.Descripcion, IV.Restante, IV.Entrega, IV.Interes, IV.IdVendedor, IV.whatssap, V.Restante, IV.MetodoPago
                        ORDER BY 
                            IV.Fecha ASC";


                var idVendedorParam = new SqlParameter("@idVendedor", SqlDbType.Int);
                idVendedorParam.Value = idVendedor;

                var ventasParam = new SqlParameter("@ventas", SqlDbType.Int);
                ventasParam.Value = ventas;

                var cobranzasParam = new SqlParameter("@cobranzas", SqlDbType.Int);
                cobranzasParam.Value = cobranzas;

                var fechadesdeParam = new SqlParameter("@fechadesde", SqlDbType.DateTime);
                fechadesdeParam.Value = fechadesde.Date; // Establecer la hora a las 00:00:00

                var fechahastaParam = new SqlParameter("@fechahasta", SqlDbType.DateTime);
                //fechahastaParam.Value = fechahasta.Date.AddHours(23).AddMinutes(59).AddSeconds(59); // Establecer la hora a las 23:59:59
                fechahastaParam.Value = fechahasta.Date.AddDays(1).AddSeconds(-1); // Establecer la hora a las 23:59:59 del día seleccionado

                var resultList = db.Database.SqlQuery<Rendimiento>(query, idVendedorParam, ventasParam, cobranzasParam, fechadesdeParam, fechahastaParam).ToList();

                return resultList;
            }
        }


        public static List<RendimientoCobrado> MostrarCobrado(DateTime fechadesde, DateTime fechahasta)
        {
            using (Sistema_DavidEntities db = new Sistema_DavidEntities())
            {
                string query = @"
        SELECT 
    u.id AS IdVendedor,
    u.Nombre AS Vendedor,
    COALESCE(SUM(iv.Entrega), 0) AS TotalCobrado
FROM 
    USUARIOS u
LEFT JOIN 
    Ventas v ON u.id = v.idVendedor
LEFT JOIN 
    InformacionVentas iv ON v.id = iv.idVenta
                            AND iv.Descripcion LIKE '%Cobranza%'
                            AND iv.Fecha >= @fechadesde
                            AND iv.Fecha <= @fechahasta
WHERE 
    u.IdEstado != 4
GROUP BY 
    u.id, 
    u.Nombre;

        ";

                var fechadesdeParam = new SqlParameter("@fechadesde", SqlDbType.DateTime);
                fechadesdeParam.Value = fechadesde.Date; // Establecer la hora a las 00:00:00

                var fechahastaParam = new SqlParameter("@fechahasta", SqlDbType.DateTime);
                fechahastaParam.Value = fechahasta.Date.AddDays(1).AddSeconds(-1); // Establecer la hora a las 23:59:59 del día seleccionado

                var resultList = db.Database.SqlQuery<RendimientoCobrado>(query, fechadesdeParam, fechahastaParam).ToList();

               

                return resultList;
            }
        }



    }
}
