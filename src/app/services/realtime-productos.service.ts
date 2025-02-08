import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import PocketBase from 'pocketbase';

@Injectable({
  providedIn: 'root',
})
export class RealtimeProductsService {
  private pb: PocketBase;
  private productsSubject = new BehaviorSubject<any[]>([]);
  public products$ = this.productsSubject.asObservable();

  constructor() {
    this.pb = new PocketBase('https://db.buckapi.com:8095');
    
    // (Opcional) Autenticación
    this.pb.collection('users').authWithPassword('admin@email.com', 'admin1234').then(() => {
      console.log('Autenticado');
      this.subscribeToRealtimeChanges();
    }).catch(err => {
      console.error('Error al autenticar:', err);
    });
  }

  private subscribeToRealtimeChanges(): void {
    // Primero, obtener todos los registros existentes de productos
    this.pb.collection('productsInventory').getList(1, 50).then(records => {
      this.productsSubject.next(records.items);
      
      // Luego suscribirse a los cambios en tiempo real
      this.pb.collection('productsInventory').subscribe('*', (e) => {
        console.log(e.action, e.record);
        
        const currentProducts = this.productsSubject.value;
        let updatedProducts;

        switch (e.action) {
          case 'create':
            updatedProducts = [...currentProducts, e.record];
            break;
          case 'update':
            updatedProducts = currentProducts.map(product => 
              product.id === e.record.id ? e.record : product
            );
            break;
          case 'delete':
            updatedProducts = currentProducts.filter(product => product.id !== e.record.id);
            break;
          default:
            updatedProducts = currentProducts;
        }

        this.productsSubject.next(updatedProducts);
      });
    });
  }

  public unsubscribeFromRealtimeChanges(): void {
    this.pb.collection('productsInventory').unsubscribe('*');
  }
}
