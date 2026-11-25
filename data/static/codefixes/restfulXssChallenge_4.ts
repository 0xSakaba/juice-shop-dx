ngAfterViewInit () {
    const products = this.productService.search('')
    const quantities = this.quantityService.getAll()
    forkJoin([quantities, products]).subscribe({
      next: ([quantities, result]) => {
        const dataTable: ProductTableEntry[] = []
        const products = this.getSearchProducts(result)
        const count = this.getSearchResultCount(result, products)
        this.tableData = products
        this.trustProductDescription(products)
        for (const product of products) {
          dataTable.push({
            name: product.name,
            price: product.price,
            deluxePrice: product.deluxePrice,
            id: product.id,
            image: product.image,
            description: product.description,
            alternateImages: product.alternateImages
          })
        }
        for (const quantity of quantities) {
          const entry = dataTable.find((dataTableEntry) => {
            return dataTableEntry.id === quantity.ProductId
          })
          if (entry === undefined) {
            continue
          }
          entry.quantity = quantity.quantity
          entry.limitPerUser = quantity.limitPerUser
        }
        this.dataSource = new MatTableDataSource<ProductTableEntry>(dataTable)
        this.updatePageSizeOptions()
        this.dataSource.paginator = this.paginator
        this.setupResponsivePageSize()
        this.gridDataSource = this.dataSource.connect()
        this.allProductsCount = count
        this.searchResultCount = count
        this.resultsLength = count
        this.filterTable()
        this.routerSubscription = this.router.events.subscribe(() => {
          this.filterTable()
        })
        this.cdRef.detectChanges()
      },
      error: (err) => { console.log(err) }
    })
  }

  trustProductDescription (tableData: any[]) {
    for (let i = 0; i < tableData.length; i++) {
      tableData[i].description = this.sanitizer.bypassSecurityTrustScript(tableData[i].description)
    }
  }