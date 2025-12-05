class ApiResponse {
    constructor(statuscode, data, message ="Suscess"){
        this.statuscode = statuscode
        this.data = data
        this.message = message
        this.suscess = statuscode <400
    }
}

export { ApiResponse }