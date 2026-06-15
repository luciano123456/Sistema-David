namespace Sistema_David.Models.Modelo
{
    public class VMProductoStockFiltro
    {
        public int Id { get; set; }
        public string Nombre { get; set; }
        public int StockDeposito { get; set; }
        public int CantidadEnVendedores { get; set; }
        public int VendedoresConStock { get; set; }
    }
}
