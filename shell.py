# В shell выполните по очереди:

# 1. Проверьте что модели импортируются
from content.models import PollTag, PollVote
print("✅ Модели импортируются")

# 2. Проверьте количество тегов
print(f"Всего тегов: {PollTag.objects.count()}")

# 3. Проверьте количество голосов
print(f"Всего голосов: {PollVote.objects.count()}")

# 4. Создайте тестовый тег вручную
tag, created = PollTag.objects.get_or_create(tag="тест")
print(f"Тег создан: {created}, ID: {tag.id}")

# 5. Создайте тестовый голос
from content.models import PollVote
vote = PollVote.objects.create(tag=tag, ip_address="127.0.0.1")
print(f"Голос создан: ID {vote.id}")

# 6. Проверьте что сохранилось
print(f"Теперь тегов: {PollTag.objects.count()}")
print(f"Теперь голосов: {PollVote.objects.count()}")

# 7. Выйдите из shell
exit()