import React from 'react';

const AccountSecuritySettings: React.FC = () => {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">الحساب والأمان</h2>
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-soft">
                <p className="text-gray-500 dark:text-gray-400">هذا القسم مخصص لإدارة ملفك الشخصي وصلاحيات المستخدمين.</p>
                {/* سيتم إضافة محتوى إدارة المستخدمين والملف الشخصي هنا */}
            </div>
        </div>
    );
};

export default AccountSecuritySettings;
