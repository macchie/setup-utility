import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NetworkSetupPage } from './network-setup.page';

describe('NetworkSetupPage', () => {
  let component: NetworkSetupPage;
  let fixture: ComponentFixture<NetworkSetupPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NetworkSetupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
