with open('tools/auditor/public/index.html', 'r') as f:
    content = f.read()

diff_handler = """
      // Diff handler
      socket.on("diffUpdate", (payload) => {
         const diffEl = document.createElement("div");
         diffEl.className = "mt-4 p-4 bg-gray-800 rounded border border-blue-500";
         diffEl.innerHTML = `<h3 class="font-bold text-blue-300">Hasil Analisis Diff: ${payload.label}</h3>`;

         const ul = document.createElement("ul");
         ul.className = "list-disc pl-5 mt-2 text-sm";

         if (payload.serverChanges && payload.serverChanges.length > 0) {
            payload.serverChanges.forEach(change => {
                const li = document.createElement("li");
                li.innerHTML = change;
                ul.appendChild(li);
            });
         } else {
             ul.innerHTML += "<li class='text-gray-400'>Tidak ada mutasi terdeteksi yang valid.</li>";
         }

         diffEl.appendChild(ul);
         document.getElementById("logList").parentElement.appendChild(diffEl);
      });
"""

if "diffUpdate" not in content:
    content = content.replace('socket.on("auditComplete"', diff_handler + '\n      socket.on("auditComplete"')
    with open('tools/auditor/public/index.html', 'w') as f:
        f.write(content)
