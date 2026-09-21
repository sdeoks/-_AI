import { PropertyForm } from "./PropertyForm";

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-bold">물건 등록</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        주소 하나만 입력해도 기본 분석이 가능합니다. 경매물건이면 하단에서 추가 정보를 입력하세요.
      </p>
      <div className="mt-6">
        <PropertyForm />
      </div>
    </div>
  );
}
