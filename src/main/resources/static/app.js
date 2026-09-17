const endpoints = {
    customers: '/api/customers',
    transactions: '/api/transactions'
};

const state = { customers: [] };
const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function setFeedback(elementId, message = '', type = '') {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `feedback ${type}`;
}

function optionMarkup(customer) {
    return `<option value="${customer.accountNumber}">${customer.firstName} ${customer.lastName} — ${customer.accountNumber}</option>`;
}

function populateAccountSelects() {
    const options = state.customers.map(optionMarkup).join('');
    ['sender-account', 'receiver-account', 'history-account'].forEach((id) => {
        const select = document.getElementById(id);
        const previousValue = select.value;
        select.innerHTML = `<option value="">Selecciona una cuenta</option>${options}`;
        select.value = previousValue;
    });
}

function renderCustomers() {
    const body = document.getElementById('customers-body');
    if (!state.customers.length) {
        body.innerHTML = '<tr><td colspan="3" class="empty-state">No hay clientes registrados todavía.</td></tr>';
        return;
    }
    body.innerHTML = state.customers.map((customer) => `
    <tr>
      <td><span class="customer-name">${customer.firstName} ${customer.lastName}</span><span class="customer-id">Cliente #${customer.id ?? '—'}</span></td>
      <td>${customer.accountNumber}</td>
      <td class="align-right balance">${money.format(customer.balance ?? 0)}</td>
    </tr>`).join('');
}

async function readResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) throw new Error(typeof data === 'string' ? data : 'No fue posible procesar la solicitud.');
    return data;
}

async function loadCustomers() {
    setFeedback('customers-feedback', 'Actualizando la lista de clientes…');
    try {
        state.customers = await fetch(endpoints.customers).then(readResponse);
        renderCustomers();
        populateAccountSelects();
        setFeedback('customers-feedback', `${state.customers.length} cliente(s) disponible(s).`, 'success');
    } catch (error) {
        state.customers = [];
        renderCustomers();
        populateAccountSelects();
        setFeedback('customers-feedback', `No fue posible cargar los clientes: ${error.message}`, 'error');
    }
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('is-active', view.id === viewId));
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.view === viewId));
    window.location.hash = viewId;
}

async function submitTransfer(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    payload.amount = Number(payload.amount);
    if (payload.senderAccountNumber === payload.receiverAccountNumber) {
        setFeedback('transfer-feedback', 'La cuenta de origen y la cuenta de destino deben ser diferentes.', 'error');
        return;
    }
    setFeedback('transfer-feedback', 'Procesando transferencia…');
    try {
        const transaction = await fetch(endpoints.transactions, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(readResponse);
        setFeedback('transfer-feedback', `Transferencia de ${money.format(transaction.amount)} realizada correctamente.`, 'success');
        form.reset();
        await loadCustomers();
    } catch (error) {
        setFeedback('transfer-feedback', `No fue posible realizar la transferencia: ${error.message}`, 'error');
    }
}

async function loadHistory() {
    const account = document.getElementById('history-account').value;
    const body = document.getElementById('history-body');
    if (!account) { setFeedback('history-feedback', 'Selecciona una cuenta para consultar el historial.', 'error'); return; }
    setFeedback('history-feedback', 'Consultando movimientos…');
    try {
        const transactions = await fetch(`${endpoints.transactions}/${encodeURIComponent(account)}`).then(readResponse);
        body.innerHTML = transactions.length ? transactions.map((transaction) => {
            const outgoing = transaction.senderAccountNumber === account;
            const relatedAccount = outgoing ? transaction.receiverAccountNumber : transaction.senderAccountNumber;
            return `<tr><td>${transaction.timestamp ? dateTime.format(new Date(transaction.timestamp)) : '—'}</td><td><span class="transaction-type ${outgoing ? 'outcome' : 'income'}">${outgoing ? 'Envío' : 'Recepción'}</span></td><td>${relatedAccount}</td><td class="align-right balance">${outgoing ? '−' : '+'}${money.format(transaction.amount)}</td></tr>`;
        }).join('') : '<tr><td colspan="4" class="empty-state">Esta cuenta aún no tiene transacciones.</td></tr>';
        setFeedback('history-feedback', `${transactions.length} movimiento(s) encontrado(s).`, 'success');
    } catch (error) {
        body.innerHTML = '<tr><td colspan="4" class="empty-state">No se pudo cargar el historial.</td></tr>';
        setFeedback('history-feedback', `No fue posible cargar el historial: ${error.message}`, 'error');
    }
}

document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => showView(tab.dataset.view)));
document.getElementById('refresh-customers').addEventListener('click', loadCustomers);
document.getElementById('transfer-form').addEventListener('submit', submitTransfer);
document.getElementById('load-history').addEventListener('click', loadHistory);

const initialView = window.location.hash.slice(1);
if (['clientes', 'transferencia', 'historial'].includes(initialView)) showView(initialView);
loadCustomers();
