p = './components/labor/UnifiedLaborForm.tsx'
content = open(p).read()
old_str = "className={}"
new_str = "className={`px-1.5 py-0.5 text-[8.5px] sm:text-[10px] font-semibold rounded transition-all ${rec.paymentMethod === 'split' ? 'bg-indigo-500 text-white font-bold shadow-xs' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}"
if old_str in content:
    content = content.replace(old_str, new_str)
    open(p, "w").write(content)
    print("SUCCESS")
else:
    print("NOT FOUND")
