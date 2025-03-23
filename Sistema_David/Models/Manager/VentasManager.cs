using Sistema_David.Models.DB;
using Sistema_David.Models.Modelo;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Sistema_David.Models.Manager
{
    public class VentasManager
    {
        public static bool VerificarStock(ICollection<ProductosVenta> stock, int idVendedor)
        {


            foreach (ProductosVenta producto in stock)
            {
                VMStockUsuario stockuser = StockModel.BuscarStockUser(idVendedor, producto.IdProducto);

                if (stockuser.Cantidad < producto.Cantidad)
                    return false;
            }

            return true;
        }

      

    }
}