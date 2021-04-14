const express = require("express");
// uuid v4 to generate random uuid
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

// Array for now, because there's no db
const customers = [];

// Creating a Middleware
const verifyIfExistsAccountCPF = (request, response, next) => {
  // getting cpf frrom headers
  const { cpf } = request.headers;

  // finding customer
  const customer = customers.find(customer => customer.cpf === cpf);

  // checking if customer exists
  if (!customer) return response.status(400).json("Customer not found");

  // passing customer to request
  request.customer = customer;

  // continuing request
  return next();
};

const getBalance = (statement) => {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === 'credit')
      return acc + operation.amount;
    else 
      return acc - operation.amount;
  }, 0);

  return balance;
};

/**
 * cpf - string
 * name - string
 * id - uuid
 * statement - array
 */
app.post("/account", (request, response) => {
  // getting cpf and name from body
  const { cpf, name } = request.body;

  // checking duplicate customers
  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists)
    return response.status(400).json({ error: "Customer already Exists!" });

  // generating uuid
  const id = uuidv4();

  // add new account to array
  const newAccount = { id, cpf, name, statement: [] };
  customers.push(newAccount);

  // return status code 201 (success)
  return response.status(201).send();
});

// using middlewares in specific request 
// app.get("/statement", verifyIfExistsAccountCPF, ...

// using middlewares globaly (all bellow must pass middleware)
app.use(verifyIfExistsAccountCPF);

app.get("/statement", (request, response) => {
  // returning statement
  const { customer: { statement } } = request;
  return response.json(statement);
});

app.post("/deposit", (request, response) => {
  const { description, amount } = request.body;

  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

app.post("/withdraw", (request, response) => {
  const { amount } = request.body;
  const { customer } = request;
  const { statement } = customer;

  const balance = getBalance(statement);

  if (balance < amount)
    return response.status(400).json({error: "Insulfficient funds!"});

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

app.get("/statement/date", (request, response) => {
  // returning statement
  const { customer } = request;
  // getting date by query
  const { date } = request.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statement) => 
      statement.created_at.toDateString() === 
      new Date(dateFormat).toDateString()
  );

  return response.json(statement);
});

app.put("/account", (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(201).send();
});

app.get("/account", (request, response) => {
  const { customer } = request;

  return response.json(customer);
});

app.delete("/account", (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  return response.status(200).json(customers);
});

app.get("/balance", (request, response) => {
  const { statement } = request.customer;

  const balance = getBalance(statement);

  return response.json(balance);
});

app.post("/transfer", (request, response) => {
  const { customer } = request;
  const { toCpf, amount } = request.body;

  const destined = customers.find(customer => customer.cpf === toCpf);

  if (!destined) return response.status(400).json("Destined customer not found");

  if (destined.cpf === customer.cpf)
    return response.status(400).json("Destined customer must have different cpf");

  const customerBalance = getBalance(customer.statement);

  if (customerBalance < amount)
    return response.status(400).json({error: "Insulfficient funds!"});

  const customerStatementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };

  const destinedStatementOperation = {
    description: `${customer.name} transfer`,
    amount,
    created_at: new Date(),
    type: "credit",
  };
  
  customer.statement.push(customerStatementOperation);
  destined.statement.push(destinedStatementOperation);
  
  return response.status(201).send();
});

app.listen(3333);
