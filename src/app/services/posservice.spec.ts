import { TestBed } from '@angular/core/testing';

import { POSService } from './posservice';

describe('POSService', () => {
  let service: POSService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(POSService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
