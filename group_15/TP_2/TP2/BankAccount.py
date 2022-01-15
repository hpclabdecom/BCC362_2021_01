import json
class BankAccount:
    holder = None
    checking_balance = None 
    savings_balance = None 

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            if(key == "holder"):
                self.holder = value
            elif(key == "checking_balance"):
                self.checking_balance = float(value)
            elif(key == "savings_balance"):
                self.savings_balance = float(value)
            elif(key == "json"):
                fields = json.loads(value)
                self.holder = fields["holder"]
                self.checking_balance = fields["checking_balance"] 
                self.savings_balance = fields["savings_balance"]

            
    def toJson(self):
        return f"{{ \"holder\": \"{self.holder}\", \"checking_balance\": {self.checking_balance}, \"savings_balance\": {self.savings_balance} }}"

    def print(self):
        print(f"Bank Account -> Holder: {self.holder}  |  Checking Balance: {self.checking_balance}  |  Savings Balance: {self.savings_balance}")








if __name__ == "__main__":
    account = BankAccount(holder="Vinicius", checking_balance=100.0, savings_balance=800.0)
    print(account.toJson())
    account_2 = BankAccount(json=account.toJson())
    print(account_2.holder)