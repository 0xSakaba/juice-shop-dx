filterTable () {
    let queryParam: string = this.route.snapshot.queryParams.q
    if (queryParam) {
      queryParam = queryParam.trim()
      this.dataSource.filter = queryParam.toLowerCase()
      this.searchValue = this.sanitizer.bypassSecurityTrustIframe(queryParam)
      if (this.gridDataSourceSubscription) {
        this.gridDataSourceSubscription.unsubscribe()
      }
      this.gridDataSourceSubscription = this.gridDataSource.subscribe((result: ProductTableEntry[]) => {
        if (result.length === 0) {
          this.emptyState = true
        } else {
          this.emptyState = false
        }
      })
      this.loadSearchResultCount(queryParam)
    } else {
      this.dataSource.filter = ''
      this.searchValue = undefined
      this.emptyState = false
      this.searchResultCount = this.allProductsCount
      this.resultsLength = this.allProductsCount
      if (this.searchResultCountSubscription) {
        this.searchResultCountSubscription.unsubscribe()
      }
    }
  }