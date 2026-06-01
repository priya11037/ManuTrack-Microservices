using ProductService.Models;

namespace ProductService.Repositories.Interfaces;

public interface IBomRepository
{
    Task<IEnumerable<BomItem>> GetByProductIdAsync(int productId);
    Task<BomItem?>             GetByIdAsync(int id);
    Task<BomItem>              CreateAsync(BomItem item);
    Task                       DeleteAsync(BomItem item);
}
