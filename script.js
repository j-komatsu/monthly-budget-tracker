class BudgetTracker {
    constructor() {
        this.currentDate = new Date();
        this.expenses = JSON.parse(localStorage.getItem('expenses')) || {};
        this.monthlyBudget = parseFloat(localStorage.getItem('monthlyBudget')) || 0;
        this.currentBudgetMonth = localStorage.getItem('currentBudgetMonth') || '';
        this.editingExpenseId = null;
        
        this.init();
    }

    init() {
        this.checkMonthChange();
        this.setupEventListeners();
        this.updateCurrentMonth();
        this.updateBudgetDisplay();
        this.renderCalendar();
        this.renderHistory();
    }

    checkMonthChange() {
        const currentMonthKey = this.getMonthKey(this.currentDate);
        if (this.currentBudgetMonth && this.currentBudgetMonth !== currentMonthKey) {
            if (confirm('新しい月になりました。予算を新たに設定しますか？')) {
                this.resetBudget();
            }
        }
    }

    getMonthKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    getDateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    setupEventListeners() {
        document.getElementById('setBudgetBtn').addEventListener('click', () => this.setBudget());
        document.getElementById('resetBudgetBtn').addEventListener('click', () => this.resetBudget());
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));
        document.getElementById('addExpenseBtn').addEventListener('click', () => this.addExpense());
        document.getElementById('updateExpenseBtn').addEventListener('click', () => this.updateExpense());
        document.getElementById('cancelExpenseBtn').addEventListener('click', () => this.cancelEdit());
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('editExpenseBtn').addEventListener('click', () => this.editExpenseFromModal());
        document.getElementById('deleteExpenseBtn').addEventListener('click', () => this.deleteExpenseFromModal());

        document.getElementById('monthlyBudget').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.setBudget();
        });

        document.getElementById('expenseAmount').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addExpense();
        });

        document.getElementById('expenseModal').addEventListener('click', (e) => {
            if (e.target.id === 'expenseModal') this.closeModal();
        });

        document.getElementById('expenseDate').value = this.getDateKey(new Date());
    }

    updateCurrentMonth() {
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        document.getElementById('currentMonth').textContent = 
            `${this.currentDate.getFullYear()}年 ${monthNames[this.currentDate.getMonth()]}`;
    }

    setBudget() {
        const budgetInput = document.getElementById('monthlyBudget');
        const budget = parseFloat(budgetInput.value);
        
        if (isNaN(budget) || budget <= 0) {
            alert('正しい予算金額を入力してください');
            return;
        }

        this.monthlyBudget = budget;
        this.currentBudgetMonth = this.getMonthKey(this.currentDate);
        
        localStorage.setItem('monthlyBudget', budget.toString());
        localStorage.setItem('currentBudgetMonth', this.currentBudgetMonth);
        
        this.updateBudgetDisplay();
        budgetInput.value = '';
    }

    resetBudget() {
        if (confirm('予算をリセットしますか？現在の月の支出データも削除されます。')) {
            this.monthlyBudget = 0;
            this.currentBudgetMonth = '';
            const currentMonthKey = this.getMonthKey(this.currentDate);
            
            Object.keys(this.expenses).forEach(dateKey => {
                if (dateKey.startsWith(currentMonthKey)) {
                    delete this.expenses[dateKey];
                }
            });
            
            localStorage.removeItem('monthlyBudget');
            localStorage.removeItem('currentBudgetMonth');
            localStorage.setItem('expenses', JSON.stringify(this.expenses));
            
            this.updateBudgetDisplay();
            this.renderCalendar();
            this.renderHistory();
        }
    }

    updateBudgetDisplay() {
        const budgetSetup = document.getElementById('budgetSetup');
        const budgetSummary = document.getElementById('budgetSummary');
        const expenseForm = document.getElementById('expenseForm');

        if (this.monthlyBudget > 0) {
            budgetSetup.style.display = 'none';
            budgetSummary.style.display = 'block';
            expenseForm.style.display = 'block';

            const currentMonthExpenses = this.getCurrentMonthExpenses();
            const totalSpent = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0) || 0;
            const remainingBudget = this.monthlyBudget - totalSpent;
            const today = new Date();
            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            const remainingDays = daysInMonth - today.getDate() + 1;
            const dailyBudget = remainingDays > 0 ? Math.max(0, remainingBudget / remainingDays) : 0;

            document.getElementById('totalBudget').textContent = `¥${this.monthlyBudget.toLocaleString()}`;
            document.getElementById('totalSpent').textContent = `¥${totalSpent.toLocaleString()}`;
            document.getElementById('remainingBudget').textContent = `¥${remainingBudget.toLocaleString()}`;
            document.getElementById('dailyBudget').textContent = `¥${Math.round(dailyBudget).toLocaleString()}`;
            
            // 残日数情報を更新
            const remainingDaysInfo = document.getElementById('remainingDaysInfo');
            if (remainingDaysInfo) {
                remainingDaysInfo.textContent = `（残り${remainingDays}日で ¥${remainingBudget.toLocaleString()} ÷ ${remainingDays}日 = 1日あたり）`;
            }

            this.showWarningIfNeeded(remainingBudget, dailyBudget);
        } else {
            budgetSetup.style.display = 'block';
            budgetSummary.style.display = 'none';
            expenseForm.style.display = 'none';
        }
    }

    showWarningIfNeeded(remainingBudget, dailyBudget) {
        const existingWarning = document.querySelector('.warning');
        if (existingWarning) existingWarning.remove();

        if (remainingBudget < 0) {
            const warning = document.createElement('div');
            warning.className = 'warning';
            warning.innerHTML = '<div class="warning-text">⚠️ 予算を超過しています！</div>';
            document.querySelector('.summary-card').appendChild(warning);
        } else if (dailyBudget < this.monthlyBudget / 30 * 0.5) {
            const warning = document.createElement('div');
            warning.className = 'warning';
            warning.innerHTML = '<div class="warning-text">⚠️ 使いすぎています。節約を心がけましょう。</div>';
            document.querySelector('.summary-card').appendChild(warning);
        }
    }

    getCurrentMonthExpenses() {
        const currentMonthKey = this.getMonthKey(this.currentDate);
        const expenses = [];
        
        Object.entries(this.expenses)
            .filter(([dateKey]) => dateKey.startsWith(currentMonthKey))
            .forEach(([dateKey, expenseArray]) => {
                if (Array.isArray(expenseArray)) {
                    expenseArray.forEach(expense => {
                        expenses.push({ ...expense, dateKey });
                    });
                }
            });
        
        return expenses;
    }

    addExpense() {
        const dateInput = document.getElementById('expenseDate');
        const amountInput = document.getElementById('expenseAmount');
        const categorySelect = document.getElementById('expenseCategory');
        const memoInput = document.getElementById('expenseMemo');

        const date = dateInput.value;
        const amount = parseFloat(amountInput.value);
        const category = categorySelect.value;
        const memo = memoInput.value.trim();

        if (!date || isNaN(amount) || amount <= 0) {
            alert('日付と正しい金額を入力してください');
            return;
        }

        const expense = {
            amount: amount,
            category: category,
            memo: memo,
            timestamp: new Date().toISOString()
        };

        if (this.expenses[date]) {
            this.expenses[date].push(expense);
        } else {
            this.expenses[date] = [expense];
        }

        localStorage.setItem('expenses', JSON.stringify(this.expenses));

        amountInput.value = '';
        memoInput.value = '';
        
        this.updateBudgetDisplay();
        this.renderCalendar();
        this.renderHistory();
    }

    updateExpense() {
        if (!this.editingExpenseId) return;

        const [dateKey, expenseIndex] = this.editingExpenseId.split('-');
        const amountInput = document.getElementById('expenseAmount');
        const categorySelect = document.getElementById('expenseCategory');
        const memoInput = document.getElementById('expenseMemo');

        const amount = parseFloat(amountInput.value);
        const category = categorySelect.value;
        const memo = memoInput.value.trim();

        if (isNaN(amount) || amount <= 0) {
            alert('正しい金額を入力してください');
            return;
        }

        this.expenses[dateKey][expenseIndex] = {
            ...this.expenses[dateKey][expenseIndex],
            amount: amount,
            category: category,
            memo: memo
        };

        localStorage.setItem('expenses', JSON.stringify(this.expenses));
        this.cancelEdit();
        this.updateBudgetDisplay();
        this.renderCalendar();
        this.renderHistory();
    }

    cancelEdit() {
        this.editingExpenseId = null;
        document.getElementById('addExpenseBtn').style.display = 'inline-block';
        document.getElementById('updateExpenseBtn').style.display = 'none';
        document.getElementById('cancelExpenseBtn').style.display = 'none';
        
        document.getElementById('expenseAmount').value = '';
        document.getElementById('expenseMemo').value = '';
        document.getElementById('expenseDate').value = this.getDateKey(new Date());
    }

    renderCalendar() {
        const calendar = document.getElementById('calendar');
        const calendarTitle = document.getElementById('calendarTitle');
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        
        calendarTitle.textContent = `${year}年 ${monthNames[month]}`;
        
        calendar.innerHTML = '';
        
        const dayHeaders = ['日', '月', '火', '水', '木', '金', '土'];
        dayHeaders.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day calendar-header-day';
            dayElement.textContent = day;
            calendar.appendChild(dayElement);
        });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const today = new Date();
        const todayKey = this.getDateKey(today);

        for (let i = 0; i < 42; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const dateKey = this.getDateKey(currentDate);
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            if (currentDate.getMonth() !== month) {
                dayElement.classList.add('other-month');
            }
            
            if (dateKey === todayKey) {
                dayElement.classList.add('today');
            }

            const dayExpenses = this.expenses[dateKey] || [];
            const dayTotal = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
            
            if (dayTotal > 0) {
                dayElement.classList.add('has-expense');
                const dailyBudget = this.monthlyBudget / lastDay.getDate();
                if (dayTotal > dailyBudget * 1.5) {
                    dayElement.classList.remove('has-expense');
                    dayElement.classList.add('over-budget');
                }
            }

            dayElement.innerHTML = `
                <div class="calendar-day-number">${currentDate.getDate()}</div>
                ${dayTotal > 0 ? `<div class="calendar-day-amount">¥${dayTotal.toLocaleString()}</div>` : ''}
            `;

            dayElement.addEventListener('click', () => {
                if (dayExpenses.length > 0) {
                    this.showExpenseModal(dateKey, dayExpenses);
                } else {
                    document.getElementById('expenseDate').value = dateKey;
                }
            });

            calendar.appendChild(dayElement);
        }
    }

    changeMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.renderCalendar();
    }

    renderHistory() {
        const historyList = document.getElementById('historyList');
        const currentMonthExpenses = this.getCurrentMonthExpenses();
        
        if (currentMonthExpenses.length === 0) {
            historyList.innerHTML = '<div class="empty-state"><h3>支出データがありません</h3><p>支出を登録すると、ここに表示されます。</p></div>';
            return;
        }

        currentMonthExpenses.sort((a, b) => new Date(b.dateKey) - new Date(a.dateKey));
        
        const groupedExpenses = {};
        currentMonthExpenses.forEach(expense => {
            if (!groupedExpenses[expense.dateKey]) {
                groupedExpenses[expense.dateKey] = [];
            }
            groupedExpenses[expense.dateKey].push(expense);
        });

        historyList.innerHTML = '';
        
        Object.entries(groupedExpenses).forEach(([dateKey, expenses]) => {
            const date = new Date(dateKey);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
            const dayTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
            
            expenses.forEach((expense, index) => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.innerHTML = `
                    <div class="history-date">${dateStr}</div>
                    <div class="history-details">
                        <div class="history-memo">${expense.memo || '（メモなし）'}</div>
                        <div class="history-category">${expense.category}</div>
                    </div>
                    <div class="history-amount">¥${expense.amount.toLocaleString()}</div>
                `;
                
                historyItem.addEventListener('click', () => {
                    this.showExpenseModal(dateKey, expenses, index);
                });
                
                historyList.appendChild(historyItem);
            });
        });
    }

    showExpenseModal(dateKey, expenses, selectedIndex = 0) {
        const modal = document.getElementById('expenseModal');
        const modalContent = document.getElementById('modalContent');
        
        const date = new Date(dateKey);
        const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
        
        let content = `<h4>${dateStr}の支出</h4>`;
        
        if (expenses.length === 1) {
            const expense = expenses[0];
            content += `
                <div style="margin: 15px 0;">
                    <p><strong>金額:</strong> ¥${expense.amount.toLocaleString()}</p>
                    <p><strong>カテゴリ:</strong> ${expense.category}</p>
                    <p><strong>メモ:</strong> ${expense.memo || '（なし）'}</p>
                </div>
            `;
            this.selectedExpenseIndex = 0;
        } else {
            content += '<div style="margin: 15px 0;">';
            expenses.forEach((expense, index) => {
                const isSelected = index === selectedIndex;
                content += `
                    <div style="padding: 10px; margin: 5px 0; background: ${isSelected ? '#e6f3ff' : '#f5f5f5'}; border-radius: 5px; cursor: pointer;" onclick="budgetTracker.selectExpenseInModal(${index})">
                        <p><strong>¥${expense.amount.toLocaleString()}</strong> - ${expense.category}</p>
                        <p style="font-size: 0.9em; color: #666;">${expense.memo || '（メモなし）'}</p>
                    </div>
                `;
            });
            content += '</div>';
            this.selectedExpenseIndex = selectedIndex;
        }
        
        modalContent.innerHTML = content;
        this.modalDateKey = dateKey;
        this.modalExpenses = expenses;
        modal.style.display = 'block';
    }

    selectExpenseInModal(index) {
        this.selectedExpenseIndex = index;
        this.showExpenseModal(this.modalDateKey, this.modalExpenses, index);
    }

    editExpenseFromModal() {
        const expense = this.modalExpenses[this.selectedExpenseIndex];
        
        document.getElementById('expenseDate').value = this.modalDateKey;
        document.getElementById('expenseAmount').value = expense.amount;
        document.getElementById('expenseCategory').value = expense.category;
        document.getElementById('expenseMemo').value = expense.memo;
        
        this.editingExpenseId = `${this.modalDateKey}-${this.selectedExpenseIndex}`;
        
        document.getElementById('addExpenseBtn').style.display = 'none';
        document.getElementById('updateExpenseBtn').style.display = 'inline-block';
        document.getElementById('cancelExpenseBtn').style.display = 'inline-block';
        
        this.closeModal();
    }

    deleteExpenseFromModal() {
        if (confirm('この支出を削除しますか？')) {
            this.modalExpenses.splice(this.selectedExpenseIndex, 1);
            
            if (this.modalExpenses.length === 0) {
                delete this.expenses[this.modalDateKey];
            } else {
                this.expenses[this.modalDateKey] = this.modalExpenses;
            }
            
            localStorage.setItem('expenses', JSON.stringify(this.expenses));
            
            this.closeModal();
            this.updateBudgetDisplay();
            this.renderCalendar();
            this.renderHistory();
        }
    }

    closeModal() {
        document.getElementById('expenseModal').style.display = 'none';
    }
}

const budgetTracker = new BudgetTracker();