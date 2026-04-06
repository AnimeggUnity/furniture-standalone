((app) => {
  function exportToCSV(data = []) {
    const keys = ['AutoID', 'Name', 'DistName', 'CreateDate'];
    const headers = ['編號', '名稱', '行政區', '建立日期'];
    const rows = [headers.join(',')];
    data.sort((a, b) => b.AutoID - a.AutoID);
    data.forEach(row => {
      const line = keys.map(k => {
        const value = k === 'CreateDate' ? (row[k] ?? '').slice(0, 10) : (row[k] ?? '');
        return `"${value.toString().replace(/"/g, '""')}"`;
      }).join(',');
      rows.push(line);
    });
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'furniture-data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  app.exportToCSV = exportToCSV;
})(window.app = window.app || {});
